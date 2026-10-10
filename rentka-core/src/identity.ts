/**
 * ID step: form validation on the phone and the verification decision used by the verifyIdentity function.
 * Verification is fully automatic: the result is "verified" or "rejected" (with a reason). Nobody approves by hand.
 * Nothing from the ID is stored. The cloud keeps only verified, isAdult, a timestamp and an HMAC of the ID number.
 */
import { ParsedId, parseDate } from './idParse';
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

export interface IdForm {
  fullName: string;
  birthdate: string;
  /** null until the user picks one. */
  idType: IdType | null;
  idNumber: string;
}

/** Returns an error message per invalid field. Empty object when valid. Age is checked by decideVerification. */
export function validateIdForm(form: IdForm, today: Date = new Date()): Partial<Record<keyof IdForm, string>> {
  const errors: Partial<Record<keyof IdForm, string>> = {};
  if (nameTokens(form.fullName).length < 2) errors.fullName = 'Enter your full name as shown on the ID';
  if (!normalizeBirthdate(form.birthdate, today)) errors.birthdate = 'Enter your birthdate like 2000-01-31';
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
  form: IdForm;
  /** fullName on the user's account. */
  accountName: string;
  /** Times of this user's earlier attempts. Older ones are ignored. */
  attemptTimes: Date[];
  /** True when this ID number is already tied to a different account. */
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

export function decideVerification(input: VerificationInput): VerificationResult {
  const now = input.now ?? new Date();

  // Lockout lifts by itself once the oldest attempt in the window is 24 hours old.
  const recent = recentAttempts(input.attemptTimes, now);
  if (recent.length >= MAX_VERIFY_ATTEMPTS) {
    const liftsAt = recent[recent.length - MAX_VERIFY_ATTEMPTS].getTime() + VERIFY_WINDOW_HOURS * HOUR_MS;
    const hours = Math.max(1, Math.ceil((liftsAt - now.getTime()) / HOUR_MS));
    return reject('locked', `Too many attempts. Try again in ${hours} ${hours === 1 ? 'hour' : 'hours'}.`, hours);
  }

  const errors = validateIdForm(input.form, now);
  const firstError = errors.fullName ?? errors.birthdate ?? errors.idType ?? errors.idNumber;
  if (firstError) return reject('invalid', firstError);

  if (!isAdult(normalizeBirthdate(input.form.birthdate, now)!, now)) {
    return reject('underage', 'You must be at least 18 years old to use RentKa.');
  }
  if (!namesMatch(input.form.fullName, input.accountName)) {
    return reject('nameMismatch', "Name doesn't match your account");
  }
  if (input.idAlreadyRegistered) return reject('duplicate', 'This ID is already registered.');
  if ((input.livenessRequired ?? LIVENESS_REQUIRED) && !input.livenessPassed) {
    return reject('liveness', 'The liveness check was not passed. Please try again.');
  }
  return { status: 'verified' };
}
