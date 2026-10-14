/**
 * 6-digit email code rules, shared by the sendEmailCode / verifyEmailCode functions.
 * The code itself is never stored: the function keeps only an HMAC of it.
 */

export const EMAIL_CODE_LENGTH = 6;
export const EMAIL_CODE_TTL_MINUTES = 10;
export const MAX_CODE_TRIES = 5;
export const RESEND_WAIT_SECONDS = 60;

/** A random 6-digit code, leading zeros kept. `randomInt(max)` must return an integer from 0 to max - 1. */
export function newEmailCode(randomInt: (max: number) => number): string {
  return String(randomInt(10 ** EMAIL_CODE_LENGTH)).padStart(EMAIL_CODE_LENGTH, '0');
}

export const isEmailCode = (value: unknown): value is string =>
  typeof value === 'string' && new RegExp(`^\\d{${EMAIL_CODE_LENGTH}}$`).test(value);

/** What the hash covers: the uid is included so one user's code never matches another's. */
export const emailCodeHashInput = (uid: string, code: string) => `${uid}:${code}`;

export function codeExpiresAt(sentAt: Date): Date {
  return new Date(sentAt.getTime() + EMAIL_CODE_TTL_MINUTES * 60 * 1000);
}

/** 0 when a new code may be sent now, otherwise the whole seconds left to wait. */
export function resendWaitSeconds(lastSentAt: Date | null, now: Date = new Date()): number {
  if (!lastSentAt) return 0;
  const left = RESEND_WAIT_SECONDS * 1000 - (now.getTime() - lastSentAt.getTime());
  return left > 0 ? Math.ceil(left / 1000) : 0;
}

export interface StoredEmailCode {
  expiresAt: Date;
  /** Wrong tries so far for this code. */
  tries: number;
}

export type EmailCodeCheck =
  | { status: 'verified' }
  | { status: 'wrong'; triesLeft: number; message: string }
  | { status: 'expired' | 'tooManyTries' | 'noCode'; message: string };

/**
 * Decides one verifyEmailCode attempt. A code is dead after 10 minutes or after 5 wrong tries,
 * even if the right code is typed afterwards.
 */
export function checkEmailCode(stored: StoredEmailCode | null, codeMatches: boolean, now: Date = new Date()): EmailCodeCheck {
  if (!stored) return { status: 'noCode', message: 'Ask for a new code first.' };
  if (stored.tries >= MAX_CODE_TRIES) {
    return { status: 'tooManyTries', message: 'Too many wrong tries. Ask for a new code.' };
  }
  if (now.getTime() >= stored.expiresAt.getTime()) {
    return { status: 'expired', message: 'This code has expired. Ask for a new code.' };
  }
  if (codeMatches) return { status: 'verified' };
  const triesLeft = MAX_CODE_TRIES - (stored.tries + 1);
  return {
    status: 'wrong',
    triesLeft,
    message:
      triesLeft > 0
        ? `Wrong code. ${triesLeft} ${triesLeft === 1 ? 'try' : 'tries'} left.`
        : 'Wrong code. Too many wrong tries. Ask for a new code.',
  };
}

/** What sendEmailCode returns. A resend inside 60 seconds is refused with an error that carries retryAfterSeconds. */
export type SendEmailCodeResult = { status: 'sent'; resendInSeconds: number } | { status: 'alreadyVerified' };

/** What verifyEmailCode returns. */
export type VerifyEmailCodeResult = EmailCodeCheck;
