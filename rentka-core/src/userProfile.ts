import { Role } from './stateMachine';

/**
 * The only fields a client may write when creating users/{uid}.
 * Must match the users create rule in backend/firestore.rules.
 */
export const SIGNUP_FIELDS = ['fullName', 'contact', 'email', 'roles', 'fcmToken', 'createdAt'] as const;
export type SignupField = (typeof SIGNUP_FIELDS)[number];

/** One account can act as both. The active side is a UI choice, never stored in the cloud. */
export const ALL_ROLES: Role[] = ['lender', 'borrower'];

/** Drops every key that is not in SIGNUP_FIELDS. */
export function pickSignupFields(data: Record<string, unknown>): Partial<Record<SignupField, unknown>> {
  const out: Partial<Record<SignupField, unknown>> = {};
  for (const key of SIGNUP_FIELDS) {
    if (data[key] !== undefined) out[key] = data[key];
  }
  return out;
}

/** Returns the number as 09XXXXXXXXX, or null when it is not a PH mobile number. */
export function normalizePhMobile(value: string): string | null {
  const v = value.replace(/[\s-]/g, '');
  const m = /^(?:\+63|63|0)(9\d{9})$/.exec(v);
  return m ? '0' + m[1] : null;
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export const PASSWORD_MIN_LENGTH = 8;

export interface ProfileInput {
  fullName: string;
  contact: string;
}

export interface SignupInput extends ProfileInput {
  email: string;
  password: string;
}

/** Returns an error message per invalid field. Empty object when valid. */
export function validateProfile(input: ProfileInput): Partial<Record<keyof ProfileInput, string>> {
  const errors: Partial<Record<keyof ProfileInput, string>> = {};
  if (input.fullName.trim().length < 2) errors.fullName = 'Enter your full name';
  if (!normalizePhMobile(input.contact)) errors.contact = 'Enter a mobile number like 09171234567';
  return errors;
}

/** Returns an error message per invalid field. Empty object when valid. */
export function validateSignup(input: SignupInput): Partial<Record<keyof SignupInput, string>> {
  const errors: Partial<Record<keyof SignupInput, string>> = validateProfile(input);
  if (!isValidEmail(input.email)) errors.email = 'Enter a valid email address';
  if (input.password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `Use at least ${PASSWORD_MIN_LENGTH} characters`;
  }
  return errors;
}
