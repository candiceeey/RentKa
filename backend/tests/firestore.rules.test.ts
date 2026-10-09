import { assertFails, assertSucceeds, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import {
  BORROWER, ITEM, LENDER, NEWBIE, RENTAL, STRANGER,
  createTestEnv, seed, unverifiedUser, verifiedUser,
} from './helpers';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await createTestEnv();
});

beforeEach(async () => {
  await env.clearFirestore();
  await seed(env);
});

afterAll(async () => {
  await env.cleanup();
});

const newItem = (ownerId: string, status = 'available') => ({
  ownerId, category: 'Tools', subcategory: 'Drill', characteristics: [],
  description: 'Drill', dailyRate: 100, status, currentRentalId: null,
});

const newRequest = (borrowerId: string, status = 'open') => ({
  borrowerId, category: 'Tools', subcategory: 'Drill', characteristics: [],
  description: 'Need a drill', dailyBudget: 150, status, matchedItemId: null,
});

describe('items and requests', () => {
  test('R01 unverified user cannot create an item or a request', async () => {
    const db = unverifiedUser(env, NEWBIE).firestore();
    await assertFails(db.doc('items/new1').set(newItem(NEWBIE)));
    await assertFails(db.doc('requests/new1').set(newRequest(NEWBIE)));
  });

  test('R02 verified user can create own item and own request', async () => {
    const db = verifiedUser(env, STRANGER).firestore();
    await assertSucceeds(db.doc('items/new1').set(newItem(STRANGER)));
    await assertSucceeds(db.doc('requests/new1').set(newRequest(STRANGER)));
  });

  test('R03 verified user cannot create an item for someone else or with status rented', async () => {
    const db = verifiedUser(env, STRANGER).firestore();
    await assertFails(db.doc('items/new1').set(newItem(LENDER)));
    await assertFails(db.doc('items/new2').set(newItem(STRANGER, 'rented')));
    await assertFails(db.doc('requests/new1').set(newRequest(STRANGER, 'matched')));
  });

  test('R07 owner can edit the description but not status or currentRentalId', async () => {
    const db = verifiedUser(env, LENDER).firestore();
    await assertSucceeds(db.doc(`items/${ITEM}`).update({ description: 'Updated' }));
    await assertFails(db.doc(`items/${ITEM}`).update({ status: 'rented' }));
    await assertFails(db.doc(`items/${ITEM}`).update({ currentRentalId: RENTAL }));
    await assertFails(verifiedUser(env, STRANGER).firestore().doc(`items/${ITEM}`).update({ description: 'x' }));
  });
});

describe('users', () => {
  test('R04 user cannot create own profile with verified or trustScore', async () => {
    const db = unverifiedUser(env, NEWBIE).firestore();
    await assertFails(db.doc(`users/${NEWBIE}`).set({ fullName: 'New', verified: true }));
    await assertFails(db.doc(`users/${NEWBIE}`).set({ fullName: 'New', trustScore: 5 }));
  });

  test('R04b user cannot create own profile with other function-written fields', async () => {
    const db = unverifiedUser(env, NEWBIE).firestore();
    await assertFails(db.doc(`users/${NEWBIE}`).set({ fullName: 'New', isAdult: true }));
    await assertFails(db.doc(`users/${NEWBIE}`).set({ fullName: 'New', ratingCount: 50 }));
    await assertFails(db.doc(`users/${NEWBIE}`).set({ fullName: 'New', verifiedAt: new Date() }));
    await assertFails(db.doc(`users/${NEWBIE}`).set({ fullName: 'New', idType: 'PhilSys' }));
  });

  test('R04c user can create own profile with the allowed fields only, and not for another uid', async () => {
    const db = unverifiedUser(env, NEWBIE).firestore();
    const profile = { fullName: 'New', contact: '09170000009', email: 'new@rentka.test', roles: ['borrower'] };
    await assertSucceeds(db.doc(`users/${NEWBIE}`).set(profile));
    await assertFails(db.doc(`users/${STRANGER}`).set(profile));
  });

  test('R05 user can update own fullName, contact and fcmToken', async () => {
    const db = verifiedUser(env, LENDER).firestore();
    await assertSucceeds(db.doc(`users/${LENDER}`).update({ fullName: 'Lena L.', contact: '0917', fcmToken: 't' }));
  });

  test('R06 user cannot update own verified, trustScore or ratingCount', async () => {
    const db = verifiedUser(env, LENDER).firestore();
    await assertFails(db.doc(`users/${LENDER}`).update({ verified: false }));
    await assertFails(db.doc(`users/${LENDER}`).update({ trustScore: 5 }));
    await assertFails(db.doc(`users/${LENDER}`).update({ ratingCount: 99 }));
    await assertFails(verifiedUser(env, STRANGER).firestore().doc(`users/${LENDER}`).update({ fullName: 'Hacked' }));
  });
});

describe('rentals and function-written collections', () => {
  test('R08 clients cannot write rentals, matches, deposits or reviews', async () => {
    const db = verifiedUser(env, BORROWER).firestore();
    await assertFails(db.doc(`rentals/${RENTAL}`).update({ status: 'active' }));
    await assertFails(db.doc('rentals/new1').set({ lenderId: LENDER, borrowerId: BORROWER, status: 'pending' }));
    await assertFails(db.doc('matches/match1').update({ status: 'chosen' }));
    await assertFails(db.doc(`deposits/${RENTAL}`).update({ status: 'settled' }));
    await assertFails(db.doc('reviews/new1').set({ rentalId: RENTAL, fromUid: BORROWER, toUid: LENDER, rating: 5 }));
  });

  test('R09 participants can read the rental and its chat, a non-participant cannot', async () => {
    for (const uid of [LENDER, BORROWER]) {
      const db = verifiedUser(env, uid).firestore();
      await assertSucceeds(db.doc(`rentals/${RENTAL}`).get());
      await assertSucceeds(db.collection(`rentals/${RENTAL}/messages`).get());
    }
    const db = verifiedUser(env, STRANGER).firestore();
    await assertFails(db.doc(`rentals/${RENTAL}`).get());
    await assertFails(db.collection(`rentals/${RENTAL}/messages`).get());
    await assertFails(db.doc('matches/match1').get());
  });

  test('R10 chat message must carry the sender own uid', async () => {
    const db = verifiedUser(env, BORROWER).firestore();
    const messages = db.collection(`rentals/${RENTAL}/messages`);
    await assertSucceeds(messages.add({ senderId: BORROWER, text: 'Hi' }));
    await assertFails(messages.add({ senderId: LENDER, text: 'Fake' }));
    await assertFails(verifiedUser(env, STRANGER).firestore()
      .collection(`rentals/${RENTAL}/messages`).add({ senderId: STRANGER, text: 'Hi' }));
  });

  test('R11 full unique ID is readable by the owner, and by the borrower only once the rental is on the item', async () => {
    const path = `items/${ITEM}/private/identifiers`;
    await assertSucceeds(verifiedUser(env, LENDER).firestore().doc(path).get());
    await assertFails(verifiedUser(env, BORROWER).firestore().doc(path).get());

    await env.withSecurityRulesDisabled((ctx) =>
      ctx.firestore().doc(`items/${ITEM}`).update({ status: 'rented', currentRentalId: RENTAL }));

    await assertSucceeds(verifiedUser(env, BORROWER).firestore().doc(path).get());
    await assertFails(verifiedUser(env, STRANGER).firestore().doc(path).get());
  });

  test('R12 server-only collections are closed to clients', async () => {
    const db = verifiedUser(env, LENDER).firestore();
    await assertFails(db.doc('uniqueIds/hash1').get());
    await assertFails(db.doc('idHashes/hash1').get());
    await assertFails(db.doc(`verifyAttempts/${LENDER}`).get());
    await assertFails(db.doc('transactionLogs/log1').get());
    await assertFails(db.doc('uniqueIds/hash2').set({ itemId: ITEM }));
  });
});
