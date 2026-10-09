import { readFileSync } from 'fs';
import { resolve } from 'path';
import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';

// "demo-" project ids only ever talk to the emulator, never the real rentka project.
export const PROJECT_ID = 'demo-rentka';

export const LENDER = 'lender1';
export const BORROWER = 'borrower1';
export const STRANGER = 'stranger1';
export const NEWBIE = 'newbie1'; // signed in but not verified

export const ITEM = 'item1';
export const RENTAL = 'rental1';

const rules = (file: string) => readFileSync(resolve(__dirname, '..', file), 'utf8');

export function createTestEnv(): Promise<RulesTestEnvironment> {
  return initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: rules('firestore.rules') },
    storage: { rules: rules('storage.rules') },
  });
}

// Verified users carry the custom claim that verifyIdentity will set.
export const verifiedUser = (env: RulesTestEnvironment, uid: string) =>
  env.authenticatedContext(uid, { verified: true });

export const unverifiedUser = (env: RulesTestEnvironment, uid: string) =>
  env.authenticatedContext(uid);

// One item owned by LENDER and one rental between LENDER and BORROWER, written with rules off.
export async function seed(env: RulesTestEnvironment): Promise<void> {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await db.doc(`users/${LENDER}`).set({
      fullName: 'Lena Lender', contact: '09170000001', email: 'lender@rentka.test',
      roles: ['lender'], verified: true, isAdult: true, trustScore: 3, ratingCount: 0,
    });
    await db.doc(`items/${ITEM}`).set({
      ownerId: LENDER, category: 'Tools', subcategory: 'Drill', characteristics: ['bosch'],
      description: 'Cordless drill', dailyRate: 100, status: 'available', currentRentalId: null,
      uniqueIdType: 'SERIAL', uniqueIdMasked: '•••••1234',
    });
    await db.doc(`items/${ITEM}/private/identifiers`).set({ uniqueIdValue: 'SN-0001234' });
    await db.doc(`rentals/${RENTAL}`).set({
      itemId: ITEM, lenderId: LENDER, borrowerId: BORROWER, status: 'pending', dailyRate: 100,
    });
    await db.doc(`rentals/${RENTAL}/messages/m1`).set({ senderId: LENDER, text: 'Hello' });
    await db.doc('matches/match1').set({
      itemId: ITEM, lenderId: LENDER, borrowerId: BORROWER, score: 0.8, status: 'suggested',
    });
    await db.doc(`deposits/${RENTAL}`).set({ amount: 700, total: 700, status: 'held' });
    await db.doc('reviews/review1').set({ rentalId: RENTAL, fromUid: BORROWER, toUid: LENDER, rating: 5 });
    await db.doc('uniqueIds/hash1').set({ itemId: ITEM });
    await db.doc('idHashes/hash1').set({ uid: LENDER });
    await db.doc(`verifyAttempts/${LENDER}`).set({ count: 1 });
    await db.doc('transactionLogs/log1').set({ rentalId: RENTAL, action: 'request' });
  });
}
