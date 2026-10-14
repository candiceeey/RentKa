import { createHmac, randomInt, timingSafeEqual } from 'crypto';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import {
  RESEND_WAIT_SECONDS, checkEmailCode, codeExpiresAt, emailCodeHashInput, isEmailCode, newEmailCode,
  resendWaitSeconds, type SendEmailCodeResult, type VerifyEmailCodeResult,
} from './core/emailCode';
import { sendCodeEmail } from './mailer';
import { BASE_OPTIONS } from './options';
import { GMAIL_APP_PASSWORD, ID_HMAC_SECRET } from './secrets';

type Token = { email?: string; firebase?: { sign_in_provider?: string } } | undefined;

/** Google accounts arrive with a verified email, so they skip the code. */
export const isGoogleSignIn = (token: Token) => token?.firebase?.sign_in_provider === 'google.com';

const hashCode = (uid: string, code: string) =>
  createHmac('sha256', ID_HMAC_SECRET.value()).update(emailCodeHashInput(uid, code)).digest('hex');

/**
 * Emails a new random 6-digit code. Stored in emailCodes/{uid}: only the HMAC of the code, when it was sent,
 * when it expires (10 minutes) and the wrong tries (0). A new code replaces the old one. One send per minute.
 */
export const sendEmailCode = onCall(
  { ...BASE_OPTIONS, secrets: [ID_HMAC_SECRET, GMAIL_APP_PASSWORD] },
  async (request): Promise<SendEmailCodeResult> => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Sign in first.');
    const token = request.auth?.token as Token;
    if (isGoogleSignIn(token)) return { status: 'alreadyVerified' };
    const email = token?.email;
    if (!email) throw new HttpsError('failed-precondition', 'This account has no email address.');

    const db = getFirestore();
    const userRef = db.doc(`users/${uid}`);
    const codeRef = db.doc(`emailCodes/${uid}`);
    const code = newEmailCode(randomInt);

    // Reserve the send in a transaction so two quick taps cannot both pass the one-per-minute limit.
    const reserved = await db.runTransaction(async (tx) => {
      const [userSnap, codeSnap] = await Promise.all([tx.get(userRef), tx.get(codeRef)]);
      if (!userSnap.exists) throw new HttpsError('failed-precondition', 'Finish your profile first.');
      if (userSnap.get('emailVerified') === true) return false;

      const now = new Date();
      const lastSent = codeSnap.exists ? (codeSnap.get('sentAt') as Timestamp).toDate() : null;
      const wait = resendWaitSeconds(lastSent, now);
      if (wait > 0) {
        throw new HttpsError('resource-exhausted', `Wait ${wait} seconds before asking for a new code.`, {
          retryAfterSeconds: wait,
        });
      }
      tx.set(codeRef, {
        codeHash: hashCode(uid, code),
        sentAt: Timestamp.fromDate(now),
        expiresAt: Timestamp.fromDate(codeExpiresAt(now)),
        tries: 0,
      });
      return true;
    });
    if (!reserved) return { status: 'alreadyVerified' };

    try {
      await sendCodeEmail(email, code);
    } catch {
      // Nothing was delivered: drop the reservation so the user can try again right away.
      await codeRef.delete();
      throw new HttpsError('unavailable', 'Could not send the email. Try again in a moment.');
    }
    return { status: 'sent', resendInSeconds: RESEND_WAIT_SECONDS };
  },
);

/**
 * Checks a typed code. Wrong: one try used. After 5 wrong tries or 10 minutes the code is dead.
 * Right: the code is deleted and users/{uid}.emailVerified is set. Only this function writes that field.
 */
export const verifyEmailCode = onCall(
  { ...BASE_OPTIONS, secrets: [ID_HMAC_SECRET] },
  async (request): Promise<VerifyEmailCodeResult> => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Sign in first.');
    if (isGoogleSignIn(request.auth?.token as Token)) return { status: 'verified' };

    const code = (request.data as { code?: unknown } | undefined)?.code;
    if (!isEmailCode(code)) throw new HttpsError('invalid-argument', 'Enter the 6-digit code from the email.');

    const db = getFirestore();
    const userRef = db.doc(`users/${uid}`);
    const codeRef = db.doc(`emailCodes/${uid}`);
    const typedHash = Buffer.from(hashCode(uid, code), 'hex');

    return db.runTransaction<VerifyEmailCodeResult>(async (tx) => {
      const [userSnap, codeSnap] = await Promise.all([tx.get(userRef), tx.get(codeRef)]);
      if (!userSnap.exists) throw new HttpsError('failed-precondition', 'Finish your profile first.');
      if (userSnap.get('emailVerified') === true) return { status: 'verified' };

      const stored = codeSnap.exists
        ? { expiresAt: (codeSnap.get('expiresAt') as Timestamp).toDate(), tries: codeSnap.get('tries') as number }
        : null;
      const storedHash = codeSnap.exists ? Buffer.from(codeSnap.get('codeHash') as string, 'hex') : null;
      const matches = !!storedHash && storedHash.length === typedHash.length && timingSafeEqual(storedHash, typedHash);

      const result = checkEmailCode(stored, matches, new Date());
      if (result.status === 'wrong') tx.update(codeRef, { tries: FieldValue.increment(1) });
      if (result.status === 'verified') {
        tx.delete(codeRef);
        tx.set(userRef, { emailVerified: true, emailVerifiedAt: FieldValue.serverTimestamp() }, { merge: true });
      }
      return result;
    });
  },
);
