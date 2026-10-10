import { assertFails, assertSucceeds, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import {
  BORROWER, ITEM, LENDER, NEWBIE, RATING_FIELDS, RENTAL, STRANGER, UNVERIFIED,
  createTestEnv, seed, unverifiedUser, verifiedUser,
} from './helpers';
import { SIGNUP_FIELDS, pickSignupFields, rolesFor } from '../../rentka-core/src/userProfile';

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

const newProfile = (roles: unknown) => ({
  fullName: 'New User', contact: '09170000009', email: 'new@rentka.test', roles,
});

describe('items and requests', () => {
  test('R01 unverified user cannot create an item or a request, even with both roles', async () => {
    const db = unverifiedUser(env, UNVERIFIED).firestore();
    await assertFails(db.doc('items/new1').set(newItem(UNVERIFIED)));
    await assertFails(db.doc('requests/new1').set(newRequest(UNVERIFIED)));
  });

  test('R02 verified user with the right role can create own item and own request', async () => {
    await assertSucceeds(verifiedUser(env, LENDER).firestore().doc('items/new1').set(newItem(LENDER)));
    await assertSucceeds(verifiedUser(env, BORROWER).firestore().doc('requests/new1').set(newRequest(BORROWER)));
    const both = verifiedUser(env, STRANGER).firestore();
    await assertSucceeds(both.doc('items/new2').set(newItem(STRANGER)));
    await assertSucceeds(both.doc('requests/new2').set(newRequest(STRANGER)));
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

  test('R17 borrower-only account cannot create an item, lender-only account cannot create a request', async () => {
    await assertFails(verifiedUser(env, BORROWER).firestore().doc('items/new1').set(newItem(BORROWER)));
    await assertFails(verifiedUser(env, LENDER).firestore().doc('requests/new1').set(newRequest(LENDER)));
  });

  test('R18 after adding the missing role, the same account can post on that side', async () => {
    const db = verifiedUser(env, BORROWER).firestore();
    await assertSucceeds(db.doc(`users/${BORROWER}`).update({ roles: ['borrower', 'lender'] }));
    await assertSucceeds(db.doc('items/new1').set(newItem(BORROWER)));
  });
});

describe('users: profile and protected fields', () => {
  test('R04 user cannot create own profile with verified or any of the four rating fields', async () => {
    const db = unverifiedUser(env, NEWBIE).firestore();
    await assertFails(db.doc(`users/${NEWBIE}`).set({ ...newProfile(['lender']), verified: true }));
    for (const field of RATING_FIELDS) {
      await assertFails(db.doc(`users/${NEWBIE}`).set({ ...newProfile(['lender']), [field]: 5 }));
    }
  });

  test('R04b user cannot create own profile with other function-written fields', async () => {
    const db = unverifiedUser(env, NEWBIE).firestore();
    await assertFails(db.doc(`users/${NEWBIE}`).set({ ...newProfile(['lender']), isAdult: true }));
    await assertFails(db.doc(`users/${NEWBIE}`).set({ ...newProfile(['lender']), verifiedAt: new Date() }));
    await assertFails(db.doc(`users/${NEWBIE}`).set({ ...newProfile(['lender']), idNumber: '1234567890123456' }));
  });

  test('R04c user can create own profile with the allowed fields only, and not for another uid', async () => {
    const db = unverifiedUser(env, NEWBIE).firestore();
    await assertSucceeds(db.doc(`users/${NEWBIE}`).set(newProfile(['borrower'])));
    await assertFails(db.doc('users/someoneElse').set(newProfile(['borrower'])));
  });

  test('R04d every field in the app SIGNUP_FIELDS constant is accepted by the create rule', async () => {
    const db = unverifiedUser(env, NEWBIE).firestore();
    const everyField = Object.fromEntries(SIGNUP_FIELDS.map((field) => [field, 'x']));
    await assertSucceeds(
      db.doc(`users/${NEWBIE}`).set(pickSignupFields({ ...everyField, roles: rolesFor('both'), verified: true })),
    );
  });

  test('R05 user can update own fullName, contact and fcmToken', async () => {
    const db = verifiedUser(env, LENDER).firestore();
    await assertSucceeds(db.doc(`users/${LENDER}`).update({ fullName: 'Lena L.', contact: '0917', fcmToken: 't' }));
  });

  test('R06 user cannot update own verified, isAdult or any of the four rating fields', async () => {
    const db = verifiedUser(env, LENDER).firestore();
    await assertFails(db.doc(`users/${LENDER}`).update({ verified: false }));
    await assertFails(db.doc(`users/${LENDER}`).update({ isAdult: false }));
    for (const field of RATING_FIELDS) {
      await assertFails(db.doc(`users/${LENDER}`).update({ [field]: 5 }));
    }
    await assertFails(verifiedUser(env, STRANGER).firestore().doc(`users/${LENDER}`).update({ fullName: 'Hacked' }));
  });
});

describe('users: roles', () => {
  test('R13 roles on create: missing, empty, unknown or duplicated values are denied', async () => {
    const db = unverifiedUser(env, NEWBIE).firestore();
    const { roles: _none, ...withoutRoles } = newProfile([]);
    await assertFails(db.doc(`users/${NEWBIE}`).set(withoutRoles));
    await assertFails(db.doc(`users/${NEWBIE}`).set(newProfile([])));
    await assertFails(db.doc(`users/${NEWBIE}`).set(newProfile(['admin'])));
    await assertFails(db.doc(`users/${NEWBIE}`).set(newProfile(['lender', 'admin'])));
    await assertFails(db.doc(`users/${NEWBIE}`).set(newProfile(['lender', 'lender'])));
    await assertFails(db.doc(`users/${NEWBIE}`).set(newProfile('lender')));
  });

  test('R13b roles on create: lender, borrower, or both are allowed', async () => {
    for (const [uid, choice] of [['a', 'lender'], ['b', 'borrower'], ['c', 'both']] as const) {
      const db = unverifiedUser(env, uid).firestore();
      await assertSucceeds(db.doc(`users/${uid}`).set(newProfile(rolesFor(choice))));
    }
  });

  test('R14 user can add the missing role later', async () => {
    await assertSucceeds(
      verifiedUser(env, BORROWER).firestore().doc(`users/${BORROWER}`).update({ roles: ['borrower', 'lender'] }),
    );
    await assertSucceeds(
      verifiedUser(env, LENDER).firestore().doc(`users/${LENDER}`).update({ roles: ['lender', 'borrower'] }),
    );
  });

  test('R15 user cannot remove or swap a role, or add an unknown or duplicate one', async () => {
    const both = verifiedUser(env, STRANGER).firestore();
    await assertFails(both.doc(`users/${STRANGER}`).update({ roles: ['lender'] }));
    await assertFails(both.doc(`users/${STRANGER}`).update({ roles: [] }));
    const lender = verifiedUser(env, LENDER).firestore();
    await assertFails(lender.doc(`users/${LENDER}`).update({ roles: ['borrower'] }));
    await assertFails(lender.doc(`users/${LENDER}`).update({ roles: ['lender', 'admin'] }));
    await assertFails(lender.doc(`users/${LENDER}`).update({ roles: ['lender', 'lender'] }));
    await assertFails(verifiedUser(env, STRANGER).firestore().doc(`users/${LENDER}`).update({ roles: ['lender', 'borrower'] }));
  });

  test('R16 user cannot change roles and a protected field in one write', async () => {
    const db = unverifiedUser(env, UNVERIFIED).firestore();
    await assertFails(db.doc(`users/${UNVERIFIED}`).update({ roles: ['lender', 'borrower'], verified: true }));
    const lender = verifiedUser(env, LENDER).firestore();
    await assertFails(lender.doc(`users/${LENDER}`).update({ roles: ['lender', 'borrower'], verified: false }));
    await assertFails(lender.doc(`users/${LENDER}`).update({ roles: ['lender', 'borrower'], borrowerTrustScore: 5 }));
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

  test('R09 only the two participants can read the rental and its chat', async () => {
    for (const uid of [LENDER, BORROWER]) {
      const db = verifiedUser(env, uid).firestore();
      await assertSucceeds(db.doc(`rentals/${RENTAL}`).get());
      await assertSucceeds(db.collection(`rentals/${RENTAL}/messages`).get());
    }
    const db = verifiedUser(env, STRANGER).firestore();
    await assertFails(db.doc(`rentals/${RENTAL}`).get());
    await assertFails(db.collection(`rentals/${RENTAL}/messages`).get());
    await assertFails(db.doc('matches/match1').get());
    await assertFails(env.unauthenticatedContext().firestore().collection(`rentals/${RENTAL}/messages`).get());
  });

  test('R09b inbox queries by role work for participants and are denied without the uid filter', async () => {
    const lender = verifiedUser(env, LENDER).firestore();
    await assertSucceeds(lender.collection('rentals').where('lenderId', '==', LENDER).get());
    const borrower = verifiedUser(env, BORROWER).firestore();
    await assertSucceeds(borrower.collection('rentals').where('borrowerId', '==', BORROWER).get());
    await assertFails(borrower.collection('rentals').get());
    await assertFails(verifiedUser(env, STRANGER).firestore().collection('rentals').where('lenderId', '==', LENDER).get());
  });

  test('R10 only the two participants can send a chat message, and only as themselves', async () => {
    const db = verifiedUser(env, BORROWER).firestore();
    const messages = db.collection(`rentals/${RENTAL}/messages`);
    await assertSucceeds(messages.add({ senderId: BORROWER, text: 'Hi' }));
    await assertSucceeds(
      verifiedUser(env, LENDER).firestore().collection(`rentals/${RENTAL}/messages`).add({ senderId: LENDER, text: 'Hello' }),
    );
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
    await assertFails(db.doc('idHashes/hash2').set({ uid: LENDER }));
  });
});
