import { assertFails, assertSucceeds, RulesTestEnvironment, RulesTestContext } from '@firebase/rules-unit-testing';
import {
  BORROWER, ITEM, LENDER, RENTAL, STRANGER,
  createTestEnv, seed, verifiedUser,
} from './helpers';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await createTestEnv();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.clearStorage();
  await seed(env);
});

afterAll(async () => {
  await env.cleanup();
});

const MB = 1024 * 1024;

const upload = (ctx: RulesTestContext, path: string, bytes = 1024, contentType = 'image/jpeg') =>
  ctx.storage().ref(path).put(new Uint8Array(bytes), { contentType }).then(() => undefined);

const read = (ctx: RulesTestContext, path: string) => ctx.storage().ref(path).getDownloadURL();

describe('storage', () => {
  test('S01 item photos: owner uploads an image under 5 MB, everything else is blocked', async () => {
    const lender = verifiedUser(env, LENDER);
    await assertSucceeds(upload(lender, `items/${LENDER}/${ITEM}/photo1.jpg`));
    await assertSucceeds(read(verifiedUser(env, STRANGER), `items/${LENDER}/${ITEM}/photo1.jpg`));
    await assertFails(upload(verifiedUser(env, STRANGER), `items/${LENDER}/${ITEM}/photo2.jpg`));
    await assertFails(upload(lender, `items/${LENDER}/${ITEM}/notes.pdf`, 1024, 'application/pdf'));
    await assertFails(upload(lender, `items/${LENDER}/${ITEM}/big.jpg`, 5 * MB + 1));
    await assertFails(read(env.unauthenticatedContext(), `items/${LENDER}/${ITEM}/photo1.jpg`));
  });

  test('S02 payment proofs and condition photos are for rental participants only', async () => {
    const borrower = verifiedUser(env, BORROWER);
    const lender = verifiedUser(env, LENDER);
    const stranger = verifiedUser(env, STRANGER);

    await assertSucceeds(upload(borrower, `payments/${RENTAL}/proof.jpg`));
    await assertSucceeds(read(lender, `payments/${RENTAL}/proof.jpg`));
    await assertFails(read(stranger, `payments/${RENTAL}/proof.jpg`));
    await assertFails(upload(stranger, `payments/${RENTAL}/fake.jpg`));

    await assertSucceeds(upload(lender, `condition/${RENTAL}/before1.jpg`));
    await assertSucceeds(read(borrower, `condition/${RENTAL}/before1.jpg`));
    await assertFails(read(stranger, `condition/${RENTAL}/before1.jpg`));
    await assertFails(upload(stranger, `condition/${RENTAL}/fake.jpg`));
  });

  test('S03 there is no ids/ path: ID images cannot be uploaded', async () => {
    await assertFails(upload(verifiedUser(env, LENDER), `ids/${LENDER}/front.jpg`));
  });
});
