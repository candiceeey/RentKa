import { createHmac } from 'crypto';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, Timestamp, getFirestore, type DocumentReference } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import {
  decideVerification, normalizeIdNumber, recentAttempts, validateIdForm,
  ID_TYPES, type IdForm, type VerificationResult,
} from './core/identity';
import { INITIAL_TRUST_SCORE } from './core/stateMachine';
import { BASE_OPTIONS } from './options';

const ID_HMAC_SECRET = defineSecret('ID_HMAC_SECRET');

const text = (value: unknown) => (typeof value === 'string' ? value : '');

function readForm(data: unknown): IdForm {
  const d = (data ?? {}) as Record<string, unknown>;
  const idType = ID_TYPES.find((t) => t.value === d.idType)?.value ?? null;
  return { fullName: text(d.fullName), birthdate: text(d.birthdate), idType, idNumber: text(d.idNumber) };
}

/**
 * Automatic identity check. The ID fields are used only inside this call and are never written or logged.
 * Stored: verified, isAdult, verifiedAt and starting ratings on the user, an HMAC of the ID number
 * (to block the same ID on a second account), and attempt times (for the 24-hour lockout).
 */
export const verifyIdentity = onCall(
  { ...BASE_OPTIONS, secrets: [ID_HMAC_SECRET] },
  async (request): Promise<VerificationResult> => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Sign in first.');

    const data = request.data as Record<string, unknown> | undefined;
    const form = readForm(data);
    const livenessPassed = data?.livenessPassed === true;

    const db = getFirestore();
    const userRef = db.doc(`users/${uid}`);
    const attemptsRef = db.doc(`verifyAttempts/${uid}`);

    const result = await db.runTransaction<VerificationResult>(async (tx) => {
      const [userSnap, attemptsSnap] = await Promise.all([tx.get(userRef), tx.get(attemptsRef)]);
      if (!userSnap.exists) throw new HttpsError('failed-precondition', 'Finish your profile first.');
      if (userSnap.get('verified') === true) return { status: 'verified' };

      const now = new Date();
      const stored = (attemptsSnap.get('times') ?? []) as Timestamp[];
      const attemptTimes = recentAttempts(stored.map((t) => t.toDate()), now);

      // The hash is looked up only when the number has a valid format for its ID type.
      let hashRef: DocumentReference | undefined;
      let idAlreadyRegistered = false;
      if (form.idType && !validateIdForm(form, now).idNumber) {
        const hash = createHmac('sha256', ID_HMAC_SECRET.value())
          .update(`${form.idType}:${normalizeIdNumber(form.idNumber)}`)
          .digest('hex');
        hashRef = db.doc(`idHashes/${hash}`);
        const hashSnap = await tx.get(hashRef);
        idAlreadyRegistered = hashSnap.exists && hashSnap.get('uid') !== uid;
      }

      const decision = decideVerification({
        form,
        accountName: text(userSnap.get('fullName')),
        attemptTimes,
        idAlreadyRegistered,
        livenessPassed,
        now,
      });

      // A locked-out call is not counted, so the lockout lifts by itself.
      if (decision.status === 'rejected' && decision.reason === 'locked') return decision;
      tx.set(attemptsRef, { times: [...attemptTimes, now].map((t) => Timestamp.fromDate(t)) });

      if (decision.status === 'verified' && hashRef) {
        tx.set(hashRef, { uid, createdAt: FieldValue.serverTimestamp() });
        tx.set(
          userRef,
          {
            verified: true,
            isAdult: true,
            verifiedAt: FieldValue.serverTimestamp(),
            lenderTrustScore: userSnap.get('lenderTrustScore') ?? INITIAL_TRUST_SCORE,
            lenderRatingCount: userSnap.get('lenderRatingCount') ?? 0,
            borrowerTrustScore: userSnap.get('borrowerTrustScore') ?? INITIAL_TRUST_SCORE,
            borrowerRatingCount: userSnap.get('borrowerRatingCount') ?? 0,
          },
          { merge: true },
        );
      }
      return decision;
    });

    // The rules read this claim. Set again on a repeat call, in case an earlier call stopped after the transaction.
    if (result.status === 'verified') await getAuth().setCustomUserClaims(uid, { verified: true });
    return result;
  },
);
