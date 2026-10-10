import {
  SIGNUP_FIELDS, canAddRole, cleanRoles, isValidEmail, normalizePhMobile, pickSignupFields, rolesFor,
  validateProfile, validateSignup,
} from '../src/userProfile';

test('pickSignupFields keeps only the allowed sign-up fields', () => {
  const picked = pickSignupFields({
    fullName: 'Ana Cruz', contact: '09171234567', email: 'ana@rentka.test', roles: rolesFor('lender'),
    verified: true, isAdult: true, lenderTrustScore: 5, borrowerRatingCount: 10, password: 'secret123',
  });
  expect(Object.keys(picked).sort()).toEqual(['contact', 'email', 'fullName', 'roles']);
  expect(Object.keys(picked).every((k) => (SIGNUP_FIELDS as readonly string[]).includes(k))).toBe(true);
});

test('pickSignupFields skips undefined values', () => {
  expect(pickSignupFields({ fullName: 'Ana', fcmToken: undefined })).toEqual({ fullName: 'Ana' });
});

test('rolesFor gives only what the user chose', () => {
  expect(rolesFor('lender')).toEqual(['lender']);
  expect(rolesFor('borrower')).toEqual(['borrower']);
  expect(rolesFor('both')).toEqual(['lender', 'borrower']);
});

test('cleanRoles drops unknown values and duplicates', () => {
  expect(cleanRoles(['borrower', 'admin', 'borrower'])).toEqual(['borrower']);
  expect(cleanRoles(['borrower', 'lender'])).toEqual(['lender', 'borrower']);
  expect(cleanRoles(undefined)).toEqual([]);
  expect(cleanRoles('lender')).toEqual([]);
});

test('canAddRole allows only a valid role that is not held yet', () => {
  expect(canAddRole(['borrower'], 'lender')).toBe(true);
  expect(canAddRole(['lender'], 'lender')).toBe(false);
  expect(canAddRole(['lender', 'borrower'], 'borrower')).toBe(false);
  expect(canAddRole(['borrower'], 'admin' as never)).toBe(false);
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
  const ok = {
    fullName: 'Ana Cruz', email: 'ana@rentka.test', contact: '09171234567', password: 'secret123', role: 'both' as const,
  };
  expect(validateSignup(ok)).toEqual({});
  expect(Object.keys(validateSignup({ fullName: ' ', email: 'x', contact: '123', password: 'short', role: null })).sort())
    .toEqual(['contact', 'email', 'fullName', 'password', 'role']);
  expect(validateSignup({ ...ok, password: '1234567' }).password).toBeDefined();
});

test('validateProfile checks name, contact and role choice', () => {
  expect(validateProfile({ fullName: 'Ana Cruz', contact: '+639171234567', role: 'lender' })).toEqual({});
  expect(Object.keys(validateProfile({ fullName: 'A', contact: 'abc', role: null })).sort())
    .toEqual(['contact', 'fullName', 'role']);
});
