/**
 * ID step. The raw ID details (name, birthdate, ID type, ID number) never leave the phone:
 * the phone runs the checks itself (validateIdForm, age, name match) and sends verifyIdentity only
 * a SHA-256 hash of the normalized ID type and number plus the pass/fail results (buildVerificationRequest).
 * The function adds the server-side HMAC, checks duplicates and the attempt limit, and decides
 * (decideVerification): "verified" or "rejected" with a reason. Nobody approves by hand.
 */
import { ParsedId, ParsedSex, parseDate } from './idParse';
import { sha256Hex } from './sha256';
import { isAdult } from './validators';

export type IdType = Exclude<ParsedId['idType'], 'Unknown'>;

export const ID_TYPES: { value: IdType; label: string; example: string }[] = [
  { value: 'PhilSys', label: 'PhilSys (National ID)', example: '1234-5678-9012-3456' },
  { value: 'DriversLicense', label: "Driver's License", example: 'N01-23-456789' },
  { value: 'UMID', label: 'UMID', example: '0111-2345678-9' },
  { value: 'Passport', label: 'Passport', example: 'P1234567A' },
];

/** Checked after normalizeIdNumber (upper case, no spaces or dashes). */
const ID_NUMBER_FORMAT: Record<IdType, RegExp> = {
  PhilSys: /^(\d{12}|\d{16})$/, // PSN or the 16-digit number printed on the card
  DriversLicense: /^[A-Z]\d{10}$/,
  UMID: /^\d{12}$/, // CRN
  Passport: /^(?=.*[A-Z])[A-Z0-9]{9}$/,
};

/** Same ID typed with different spacing or case must give the same value (and so the same hash). */
export function normalizeIdNumber(value: string): string {
  return value.replace(/[\s-]/g, '').toUpperCase();
}

/** Accepts the formats parseDate reads (2000-01-31, 01/31/2000, Jan 31 2000). Returns YYYY-MM-DD or null. */
export function normalizeBirthdate(value: string, today: Date = new Date()): string | null {
  const iso = parseDate(value.trim());
  if (!iso) return null;
  const date = new Date(`${iso}T00:00:00Z`);
  // Rejects dates that do not exist (Feb 30) and dates in the future.
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== iso || date > today) return null;
  return iso;
}

export type Sex = ParsedSex;

export const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
];

/** Everything on the ID form. All of it stays on the phone: only a hash and pass/fail results are sent. */
export interface IdForm {
  fullName: string;
  birthdate: string;
  /** null until the user picks one. */
  idType: IdType | null;
  idNumber: string;
  address: string;
  /** null until the user picks one. */
  sex: Sex | null;
}

export const ADDRESS_MIN_LENGTH = 5;

/** Returns an error message per invalid field. Empty object when valid. The age is checked separately (runDeviceChecks). */
export function validateIdForm(form: IdForm, today: Date = new Date()): Partial<Record<keyof IdForm, string>> {
  const errors: Partial<Record<keyof IdForm, string>> = {};
  if (nameTokens(form.fullName).length < 2) errors.fullName = 'Enter your full name as shown on the ID';
  if (!normalizeBirthdate(form.birthdate, today)) errors.birthdate = 'Enter your birthdate like 2000-01-31';
  if (form.address.trim().length < ADDRESS_MIN_LENGTH) errors.address = 'Enter your address as shown on the ID';
  if (!form.sex) errors.sex = 'Choose Male or Female';
  if (!form.idType) {
    errors.idType = 'Choose the type of ID';
  } else if (!ID_NUMBER_FORMAT[form.idType].test(normalizeIdNumber(form.idNumber))) {
    const example = ID_TYPES.find((t) => t.value === form.idType)!.example;
    errors.idNumber = `Enter the ID number like ${example}`;
  }
  return errors;
}

const NAME_SUFFIXES = ['jr', 'sr', 'ii', 'iii', 'iv'];

/** Lower case, no accents or punctuation, no initials or suffixes. "Dela Cruz, Juan S." -> [dela, cruz, juan]. */
function nameTokens(name: string): string[] {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !NAME_SUFFIXES.includes(t));
}

/**
 * Loose comparison of the name on the ID with the account name.
 * Ignores case, accents, extra spaces and word order ("Last, First"), and allows a missing middle name:
 * the shorter name needs at least two words, all of which appear in the longer one.
 */
export function namesMatch(a: string, b: string): boolean {
  const [short, long] = [nameTokens(a), nameTokens(b)].sort((x, y) => x.length - y.length);
  return short.length >= 2 && short.every((t) => long.includes(t));
}

/** What gets hashed: "PhilSys:1234567890123456". Same ID typed differently gives the same value. */
export function idHashInput(idType: IdType, idNumber: string): string {
  return `${idType}:${normalizeIdNumber(idNumber)}`;
}

/** Pass/fail results of the checks the phone runs on the raw ID details. Only these booleans are sent. */
export interface DeviceChecks {
  /** validateIdForm found no errors (name, birthdate, ID type, ID number format). */
  formValid: boolean;
  /** 18 or older on the day of the check. */
  isAdult: boolean;
  /** Name on the ID loosely matches the account name (namesMatch). */
  nameMatches: boolean;
}

/** Everything verifyIdentity receives. No name, birthdate, ID type or ID number. */
export interface VerificationRequest {
  /** Lower-case hex SHA-256 of idHashInput(idType, idNumber). */
  idHash: string;
  checks: DeviceChecks;
  /** Sent by the liveness module once it exists. */
  livenessPassed?: boolean;
}

export function runDeviceChecks(form: IdForm, accountName: string, today: Date = new Date()): DeviceChecks {
  const formValid = Object.keys(validateIdForm(form, today)).length === 0;
  const birthdate = normalizeBirthdate(form.birthdate, today);
  return {
    formValid,
    isAdult: !!birthdate && isAdult(birthdate, today),
    nameMatches: namesMatch(form.fullName, accountName),
  };
}

/**
 * Builds the only payload the phone sends to verifyIdentity. Call it after validateIdForm passes
 * (the ID type must be chosen to hash). The raw form stays on the phone.
 */
export function buildVerificationRequest(form: IdForm, accountName: string, today: Date = new Date()): VerificationRequest {
  if (!form.idType) throw new Error('ID type not chosen');
  return {
    idHash: sha256Hex(idHashInput(form.idType, form.idNumber)),
    checks: runDeviceChecks(form, accountName, today),
  };
}

export const isIdHash = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);

/** Reads an untrusted payload on the server. Returns null when it is not a well-formed VerificationRequest. */
export function parseVerificationRequest(data: unknown): VerificationRequest | null {
  const d = (data ?? {}) as Record<string, unknown>;
  const c = (d.checks ?? {}) as Record<string, unknown>;
  const bool = (v: unknown) => typeof v === 'boolean';
  if (!isIdHash(d.idHash) || !bool(c.formValid) || !bool(c.isAdult) || !bool(c.nameMatches)) return null;
  return {
    idHash: d.idHash,
    checks: { formValid: c.formValid as boolean, isAdult: c.isAdult as boolean, nameMatches: c.nameMatches as boolean },
    livenessPassed: d.livenessPassed === true,
  };
}

export const MAX_VERIFY_ATTEMPTS = 5;
export const VERIFY_WINDOW_HOURS = 24;
const HOUR_MS = 60 * 60 * 1000;

/**
 * Off until the liveness module (ML Kit Face Detection) exists. When on, a result can be "verified"
 * only if the phone reports a passed liveness check.
 */
export const LIVENESS_REQUIRED = false;

export type RejectReason = 'locked' | 'invalid' | 'underage' | 'nameMismatch' | 'duplicate' | 'liveness';

export type VerificationResult =
  | { status: 'verified' }
  | { status: 'rejected'; reason: RejectReason; message: string; retryAfterHours?: number };

export interface VerificationInput {
  checks: DeviceChecks;
  /** Times of this user's earlier attempts. Older ones are ignored. */
  attemptTimes: Date[];
  /** True when this ID hash is already tied to a different account. */
  idAlreadyRegistered: boolean;
  livenessPassed?: boolean;
  now?: Date;
  livenessRequired?: boolean;
}

/** Attempts inside the 24-hour window, oldest first. */
export function recentAttempts(attemptTimes: Date[], now: Date = new Date()): Date[] {
  const cutoff = now.getTime() - VERIFY_WINDOW_HOURS * HOUR_MS;
  return attemptTimes.filter((t) => t.getTime() > cutoff).sort((a, b) => a.getTime() - b.getTime());
}

const reject = (reason: RejectReason, message: string, retryAfterHours?: number): VerificationResult =>
  retryAfterHours === undefined
    ? { status: 'rejected', reason, message }
    : { status: 'rejected', reason, message, retryAfterHours };

/** Runs on the server with the phone's pass/fail results. Order: lockout, details, age, name, duplicate, liveness. */
export function decideVerification(input: VerificationInput): VerificationResult {
  const now = input.now ?? new Date();

  // Lockout lifts by itself once the oldest attempt in the window is 24 hours old.
  const recent = recentAttempts(input.attemptTimes, now);
  if (recent.length >= MAX_VERIFY_ATTEMPTS) {
    const liftsAt = recent[recent.length - MAX_VERIFY_ATTEMPTS].getTime() + VERIFY_WINDOW_HOURS * HOUR_MS;
    const hours = Math.max(1, Math.ceil((liftsAt - now.getTime()) / HOUR_MS));
    return reject('locked', `Too many attempts. Try again in ${hours} ${hours === 1 ? 'hour' : 'hours'}.`, hours);
  }

  if (!input.checks.formValid) return reject('invalid', 'Your ID details are not valid. Check them and try again.');
  if (!input.checks.isAdult) return reject('underage', 'You must be at least 18 years old to use RentKa.');
  if (!input.checks.nameMatches) return reject('nameMismatch', "Name doesn't match your account");
  if (input.idAlreadyRegistered) return reject('duplicate', 'This ID is already registered.');
  if ((input.livenessRequired ?? LIVENESS_REQUIRED) && !input.livenessPassed) {
    return reject('liveness', 'The liveness check was not passed. Please try again.');
  }
  return { status: 'verified' };
}
