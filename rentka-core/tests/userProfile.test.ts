import {
  ALL_ROLES, SIGNUP_FIELDS, isValidEmail, normalizePhMobile, pickSignupFields, validateProfile, validateSignup,
} from '../src/userProfile';

test('pickSignupFields keeps only the allowed sign-up fields', () => {
  const picked = pickSignupFields({
    fullName: 'Ana Cruz', contact: '09171234567', email: 'ana@rentka.test', roles: ALL_ROLES,
    verified: true, isAdult: true, trustScore: 5, ratingCount: 10, password: 'secret123',
  });
  expect(Object.keys(picked).sort()).toEqual(['contact', 'email', 'fullName', 'roles']);
  expect(Object.keys(picked).every((k) => (SIGNUP_FIELDS as readonly string[]).includes(k))).toBe(true);
});

test('pickSignupFields skips undefined values', () => {
  expect(pickSignupFields({ fullName: 'Ana', fcmToken: undefined })).toEqual({ fullName: 'Ana' });
});

test('normalizePhMobile accepts the common PH formats', () => {
  expect(normalizePhMobile('09171234567')).toBe('09171234567');
  expect(normalizePhMobile('+639171234567')).toBe('09171234567');
  expect(normalizePhMobile('639171234567')).toBe('09171234567');
  expect(normalizePhMobile('0917 123-4567')).toBe('09171234567');
  expect(normalizePhMobile('0917123456')).toBeNull(); // 10 digits
  expect(normalizePhMobile('08171234567')).toBeNull(); // not a mobile prefix
  expect(normalizePhMobile('')).toBeNull();
});

test('isValidEmail', () => {
  expect(isValidEmail('ana@rentka.test')).toBe(true);
  expect(isValidEmail(' ana@rentka.test ')).toBe(true);
  expect(isValidEmail('ana@rentka')).toBe(false);
  expect(isValidEmail('ana rentka.test')).toBe(false);
});

test('validateSignup returns one message per invalid field', () => {
  const ok = { fullName: 'Ana Cruz', email: 'ana@rentka.test', contact: '09171234567', password: 'secret123' };
  expect(validateSignup(ok)).toEqual({});
  expect(Object.keys(validateSignup({ fullName: ' ', email: 'x', contact: '123', password: 'short' })).sort())
    .toEqual(['contact', 'email', 'fullName', 'password']);
  expect(validateSignup({ ...ok, password: '1234567' }).password).toBeDefined();
});

test('validateProfile checks name and contact only', () => {
  expect(validateProfile({ fullName: 'Ana Cruz', contact: '+639171234567' })).toEqual({});
  expect(Object.keys(validateProfile({ fullName: 'A', contact: 'abc' })).sort()).toEqual(['contact', 'fullName']);
});
