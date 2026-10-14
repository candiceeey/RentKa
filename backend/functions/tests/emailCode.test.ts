import { getAuth } from 'firebase-admin/auth';
import { Timestamp, getFirestore } from 'firebase-admin/firestore';
import type { CallableRequest } from 'firebase-functions/v2/https';

import { buildVerificationRequest } from '../src/core/identity';
import { MAX_CODE_TRIES } from '../src/core/emailCode';
import { sendEmailCode, verifyEmailCode, verifyIdentity } from '../src/index';

// No real email: the Gmail transport is replaced, and the test reads the code from the mocked message.
const mockSendMail = jest.fn();
jest.mock('nodemailer', () => ({ createTransport: () => ({ sendMail: mockSendMail }) }));

const PROJECT = process.env.GCLOUD_PROJECT!;
const db = () => getFirestore();

const auth = (uid: string, provider = 'password') => ({
  uid,
  token: { email: `${uid}@rentka.test`, firebase: { sign_in_provider: provider } },
});
const request = <T>(uid: string, data: T, provider?: string) =>
  ({ data, auth: auth(uid, provider), rawRequest: {}, acceptsStreaming: false }) as unknown as CallableRequest<T>;

const send = (uid: string, provider?: string) => sendEmailCode.run(request(uid, {}, provider));
const verify = (uid: string, code: string) => verifyEmailCode.run(request(uid, { code }));

/** The code in the most recent mocked email. */
function lastSentCode(): string {
  const text = mockSendMail.mock.calls.at(-1)?.[0]?.text as string;
  return /\b(\d{6})\b/.exec(text)![1];
}
const wrongCodeFor = (code: string) => (code === '000000' ? '111111' : '000000');

async function clearEmulators() {
  const firestore = process.env.FIRESTORE_EMULATOR_HOST;
  const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  await fetch(`http://${firestore}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
  await fetch(`http://${authHost}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
}

async function newUser(uid: string) {
  await getAuth().createUser({ uid, email: `${uid}@rentka.test` });
  await db().doc(`users/${uid}`).set({ fullName: 'Ana Santos Cruz', roles: ['borrower'] });
}

beforeEach(async () => {
  mockSendMail.mockReset().mockResolvedValue({});
  await clearEmulators();
});

describe('sendEmailCode', () => {
  test('E01 emails a 6-digit code and stores only its hash, an expiry and a try counter', async () => {
    await newUser('u1');
    await expect(send('u1')).resolves.toEqual({ status: 'sent', resendInSeconds: 60 });

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    expect(mockSendMail.mock.calls[0][0].to).toBe('u1@rentka.test');
    const code = lastSentCode();

    const stored = (await db().doc('emailCodes/u1').get()).data()!;
    expect(Object.keys(stored).sort()).toEqual(['codeHash', 'expiresAt', 'sentAt', 'tries']);
    expect(stored.codeHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(stored)).not.toContain(code);
    expect(stored.tries).toBe(0);
    const ttl = (stored.expiresAt as Timestamp).toMillis() - (stored.sentAt as Timestamp).toMillis();
    expect(ttl).toBe(10 * 60 * 1000);
  });

  test('E02 resend limit: a second code within 60 seconds is refused and no email goes out', async () => {
    await newUser('u1');
    await send('u1');
    await expect(send('u1')).rejects.toMatchObject({ code: 'resource-exhausted' });
    expect(mockSendMail).toHaveBeenCalledTimes(1);
  });

  test('E03 after 60 seconds a new code can be sent; it replaces the old one with fresh tries', async () => {
    await newUser('u1');
    await send('u1');
    const oldCode = lastSentCode();
    await verify('u1', wrongCodeFor(oldCode));
    // Move the first send 61 seconds into the past.
    await db().doc('emailCodes/u1').update({ sentAt: Timestamp.fromMillis(Date.now() - 61_000) });

    await expect(send('u1')).resolves.toMatchObject({ status: 'sent' });
    expect(mockSendMail).toHaveBeenCalledTimes(2);
    expect((await db().doc('emailCodes/u1').get()).get('tries')).toBe(0);
    const newCode = lastSentCode();
    if (newCode !== oldCode) await expect(verify('u1', oldCode)).resolves.toMatchObject({ status: 'wrong' });
    await expect(verify('u1', newCode)).resolves.toEqual({ status: 'verified' });
  });

  test('E04 Google sign-in and already verified accounts get no email', async () => {
    await newUser('g1');
    await expect(send('g1', 'google.com')).resolves.toEqual({ status: 'alreadyVerified' });
    await newUser('u2');
    await db().doc('users/u2').update({ emailVerified: true });
    await expect(send('u2')).resolves.toEqual({ status: 'alreadyVerified' });
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  test('E05 if the email cannot be sent, nothing is kept and the user can retry at once', async () => {
    await newUser('u1');
    mockSendMail.mockRejectedValueOnce(new Error('SMTP down'));
    await expect(send('u1')).rejects.toMatchObject({ code: 'unavailable' });
    expect((await db().doc('emailCodes/u1').get()).exists).toBe(false);
    await expect(send('u1')).resolves.toMatchObject({ status: 'sent' });
  });

  test('E06 signed-out calls are refused', async () => {
    await expect(sendEmailCode.run({ data: {}, rawRequest: {} } as unknown as CallableRequest)).rejects.toMatchObject({
      code: 'unauthenticated',
    });
  });
});

describe('verifyEmailCode', () => {
  test('E07 the right code verifies the email and deletes the code', async () => {
    await newUser('u1');
    await send('u1');
    await expect(verify('u1', lastSentCode())).resolves.toEqual({ status: 'verified' });
    const user = (await db().doc('users/u1').get()).data()!;
    expect(user.emailVerified).toBe(true);
    expect(user.emailVerifiedAt).toBeDefined();
    expect((await db().doc('emailCodes/u1').get()).exists).toBe(false);
  });

  test('E08 expiry: after 10 minutes even the right code is refused', async () => {
    await newUser('u1');
    await send('u1');
    await db().doc('emailCodes/u1').update({ expiresAt: Timestamp.fromMillis(Date.now() - 1000) });
    await expect(verify('u1', lastSentCode())).resolves.toMatchObject({ status: 'expired' });
    expect((await db().doc('users/u1').get()).get('emailVerified')).toBeUndefined();
  });

  test('E09 wrong tries count down; the right code still works on the 5th try', async () => {
    await newUser('u1');
    await send('u1');
    const code = lastSentCode();
    for (let left = MAX_CODE_TRIES - 1; left >= 1; left--) {
      await expect(verify('u1', wrongCodeFor(code))).resolves.toMatchObject({ status: 'wrong', triesLeft: left });
    }
    await expect(verify('u1', code)).resolves.toEqual({ status: 'verified' });
  });

  test('E10 after 5 wrong tries the code is dead, even when the right code is typed', async () => {
    await newUser('u1');
    await send('u1');
    const code = lastSentCode();
    for (let i = 0; i < MAX_CODE_TRIES; i++) await verify('u1', wrongCodeFor(code));
    await expect(verify('u1', code)).resolves.toMatchObject({ status: 'tooManyTries' });
    expect((await db().doc('users/u1').get()).get('emailVerified')).toBeUndefined();
  });

  test('E11 a code belongs to one account: another user cannot use it', async () => {
    await newUser('u1');
    await newUser('u2');
    await send('u1');
    const u1Code = lastSentCode();
    await send('u2');
    const u2Code = lastSentCode();
    // The hash covers "uid:code", so even the same digits give different stored hashes.
    const [h1, h2] = await Promise.all(['u1', 'u2'].map(async (u) => (await db().doc(`emailCodes/${u}`).get()).get('codeHash')));
    expect(h1).not.toBe(h2);
    if (u1Code !== u2Code) await expect(verify('u2', u1Code)).resolves.toMatchObject({ status: 'wrong' });
  });

  test('E12 no code sent yet, or a malformed code', async () => {
    await newUser('u1');
    await expect(verify('u1', '123456')).resolves.toMatchObject({ status: 'noCode' });
    await expect(verify('u1', '12345')).rejects.toMatchObject({ code: 'invalid-argument' });
  });
});

describe('verifyIdentity email gate', () => {
  const idRequest = () =>
    buildVerificationRequest(
      {
        fullName: 'Ana Santos Cruz', birthdate: '2000-01-31', idType: 'PhilSys', idNumber: '1234-5678-9012-3456',
        address: 'Purok 2, Libertad, Butuan City', sex: 'Female',
      },
      'Ana Santos Cruz',
    );

  test('E13 the ID step is refused until verifyEmailCode has set emailVerified', async () => {
    await newUser('u1');
    await expect(verifyIdentity.run(request('u1', idRequest()))).rejects.toMatchObject({
      code: 'failed-precondition', message: 'Verify your email first.',
    });
    await send('u1');
    await verify('u1', lastSentCode());
    await expect(verifyIdentity.run(request('u1', idRequest()))).resolves.toEqual({ status: 'verified' });
  });

  test('E14 Google sign-in accounts skip the email code', async () => {
    await newUser('g1');
    await expect(verifyIdentity.run(request('g1', idRequest(), 'google.com'))).resolves.toEqual({ status: 'verified' });
  });
});
