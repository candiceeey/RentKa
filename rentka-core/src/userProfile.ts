import { Role } from './stateMachine';

/**
 * The only fields a client may write when creating users/{uid}.
 * Must match the users create rule in backend/firestore.rules.
 */
export const SIGNUP_FIELDS = ['fullName', 'contact', 'email', 'roles', 'fcmToken', 'createdAt'] as const;
export type SignupField = (typeof SIGNUP_FIELDS)[number];

/** Every role an account can hold. An account holds only the ones its owner chose. */
export const VALID_ROLES: Role[] = ['lender', 'borrower'];

/** What the user picks under "Sign up as". */
export type RoleChoice = Role | 'both';

export function rolesFor(choice: RoleChoice): Role[] {
  return choice === 'both' ? [...VALID_ROLES] : [choice];
}

/** Keeps only valid roles, without duplicates, in a fixed order. Anything else in the list is ignored. */
export function cleanRoles(roles: unknown): Role[] {
  const list = Array.isArray(roles) ? roles : [];
  return VALID_ROLES.filter((r) => list.includes(r));
}

/** A role can be added later (never removed) when it is valid and not held yet. */
export function canAddRole(roles: unknown, role: Role): boolean {
  return VALID_ROLES.includes(role) && !cleanRoles(roles).includes(role);
}

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
  /** null until the user picks one under "Sign up as". */
  role: RoleChoice | null;
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
  if (!input.role) errors.role = 'Choose Lender, Borrower or Both';
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
