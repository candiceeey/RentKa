import {
  MAX_CODE_TRIES, checkEmailCode, codeExpiresAt, emailCodeHashInput, isEmailCode, newEmailCode, resendWaitSeconds,
} from '../src/emailCode';

const NOW = new Date('2026-10-15T08:00:00Z');
const secondsAgo = (s: number) => new Date(NOW.getTime() - s * 1000);
const fresh = { expiresAt: codeExpiresAt(NOW), tries: 0 };

test('codes are always 6 digits, leading zeros kept', () => {
  expect(newEmailCode(() => 42)).toBe('000042');
  expect(newEmailCode(() => 999999)).toBe('999999');
  expect(newEmailCode((max) => max - 1)).toBe('999999');
  expect(isEmailCode('012345')).toBe(true);
  expect(isEmailCode('12345')).toBe(false);
  expect(isEmailCode('12345a')).toBe(false);
  expect(isEmailCode(123456)).toBe(false);
});

test('the hash input ties the code to the user', () => {
  expect(emailCodeHashInput('uid1', '123456')).not.toBe(emailCodeHashInput('uid2', '123456'));
});

test('a code expires 10 minutes after it is sent', () => {
  expect(codeExpiresAt(NOW).getTime() - NOW.getTime()).toBe(10 * 60 * 1000);
  expect(checkEmailCode({ expiresAt: new Date(NOW.getTime() + 1), tries: 0 }, true, NOW).status).toBe('verified');
  expect(checkEmailCode({ expiresAt: NOW, tries: 0 }, true, NOW).status).toBe('expired');
});

test('wrong tries count down and the 5th wrong try kills the code', () => {
  expect(checkEmailCode(fresh, false, NOW)).toMatchObject({ status: 'wrong', triesLeft: 4, message: 'Wrong code. 4 tries left.' });
  expect(checkEmailCode({ ...fresh, tries: 3 }, false, NOW)).toMatchObject({ triesLeft: 1, message: 'Wrong code. 1 try left.' });
  expect(checkEmailCode({ ...fresh, tries: 4 }, false, NOW)).toMatchObject({ triesLeft: 0 });
  expect(checkEmailCode({ ...fresh, tries: 4 }, true, NOW).status).toBe('verified');
  expect(checkEmailCode({ ...fresh, tries: MAX_CODE_TRIES }, true, NOW).status).toBe('tooManyTries');
});

test('no stored code means the user must ask for one', () => {
  expect(checkEmailCode(null, true, NOW).status).toBe('noCode');
});

test('one resend per minute', () => {
  expect(resendWaitSeconds(null, NOW)).toBe(0);
  expect(resendWaitSeconds(secondsAgo(0), NOW)).toBe(60);
  expect(resendWaitSeconds(secondsAgo(59.5), NOW)).toBe(1);
  expect(resendWaitSeconds(secondsAgo(60), NOW)).toBe(0);
  expect(resendWaitSeconds(secondsAgo(600), NOW)).toBe(0);
});
