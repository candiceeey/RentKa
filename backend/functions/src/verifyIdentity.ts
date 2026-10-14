import { createHmac } from 'crypto';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import {
  decideVerification, parseVerificationRequest, recentAttempts, type VerificationResult,
} from './core/identity';
import { BASE_OPTIONS } from './options';

const ID_HMAC_SECRET = defineSecret('ID_HMAC_SECRET');

/**
 * Automatic identity check. The phone never sends the name, birthdate, ID type or ID number: it runs those
 * checks itself and sends only a SHA-256 hash of the normalized ID type and number plus pass/fail results.
 * This function keys that hash with a server-side HMAC (so the stored value cannot be matched without the
 * secret), blocks the same ID on a second account, applies the 24-hour attempt limit, and decides.
 * Stored: verified, isAdult, verifiedAt on the user; idHashes/{HMAC} -> uid; attempt times for the lockout.
 */
export const verifyIdentity = onCall(
  { ...BASE_OPTIONS, secrets: [ID_HMAC_SECRET] },
  async (request): Promise<VerificationResult> => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Sign in first.');
    // Email/password accounts must confirm their email first. Google accounts arrive already verified.
    if (request.auth?.token.email_verified !== true) {
      throw new HttpsError('failed-precondition', 'Verify your email first.');
    }

    const input = parseVerificationRequest(request.data);
    if (!input) throw new HttpsError('invalid-argument', 'Update the app and try again.');

    const db = getFirestore();
    const userRef = db.doc(`users/${uid}`);
    const attemptsRef = db.doc(`verifyAttempts/${uid}`);
    const hmac = createHmac('sha256', ID_HMAC_SECRET.value()).update(input.idHash).digest('hex');
    const hashRef = db.doc(`idHashes/${hmac}`);

    const result = await db.runTransaction<VerificationResult>(async (tx) => {
      const [userSnap, attemptsSnap, hashSnap] = await Promise.all([tx.get(userRef), tx.get(attemptsRef), tx.get(hashRef)]);
      if (!userSnap.exists) throw new HttpsError('failed-precondition', 'Finish your profile first.');
      if (userSnap.get('verified') === true) return { status: 'verified' };

      const now = new Date();
      const stored = (attemptsSnap.get('times') ?? []) as Timestamp[];
      const attemptTimes = recentAttempts(stored.map((t) => t.toDate()), now);

      const decision = decideVerification({
        checks: input.checks,
        attemptTimes,
        idAlreadyRegistered: hashSnap.exists && hashSnap.get('uid') !== uid,
        livenessPassed: input.livenessPassed,
        now,
      });

      // A locked-out call is not counted, so the lockout lifts by itself.
      if (decision.status === 'rejected' && decision.reason === 'locked') return decision;
      tx.set(attemptsRef, { times: [...attemptTimes, now].map((t) => Timestamp.fromDate(t)) });

      if (decision.status === 'verified') {
        tx.set(hashRef, { uid, createdAt: FieldValue.serverTimestamp() });
        tx.set(userRef, { verified: true, isAdult: true, verifiedAt: FieldValue.serverTimestamp() }, { merge: true });
      }
      return decision;
    });

    // The rules read this claim. Set again on a repeat call, in case an earlier call stopped after the transaction.
    if (result.status === 'verified') await getAuth().setCustomUserClaims(uid, { verified: true });
    return result;
  },
);
