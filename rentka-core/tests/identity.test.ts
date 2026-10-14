import { createHash } from 'crypto';

import {
  DeviceChecks, IdForm, MAX_VERIFY_ATTEMPTS, buildVerificationRequest, decideVerification, idHashInput, namesMatch,
  normalizeBirthdate, normalizeIdNumber, parseVerificationRequest, runDeviceChecks, validateIdForm,
} from '../src/identity';

const NOW = new Date('2026-10-10T08:00:00Z');
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 60 * 60 * 1000);

const form = (over: Partial<IdForm> = {}): IdForm => ({
  fullName: 'Ana Santos Cruz', birthdate: '2000-01-31', idType: 'PhilSys', idNumber: '1234-5678-9012-3456',
  address: 'Purok 2, Libertad, Butuan City', sex: 'Female', ...over,
});

const PASS: DeviceChecks = { formValid: true, isAdult: true, nameMatches: true };

const decide = (over: Partial<Parameters<typeof decideVerification>[0]> = {}) =>
  decideVerification({ checks: PASS, attemptTimes: [], idAlreadyRegistered: false, now: NOW, ...over });

test('normalizeIdNumber ignores spacing, dashes and case', () => {
  expect(normalizeIdNumber(' n01-23-456789 ')).toBe('N0123456789');
  expect(normalizeIdNumber('1234 5678 9012 3456')).toBe('1234567890123456');
});

test('normalizeBirthdate accepts common formats and rejects impossible or future dates', () => {
  expect(normalizeBirthdate('2000-01-31', NOW)).toBe('2000-01-31');
  expect(normalizeBirthdate('01/31/2000', NOW)).toBe('2000-01-31');
  expect(normalizeBirthdate('Jan 31, 2000', NOW)).toBe('2000-01-31');
  expect(normalizeBirthdate('2001-02-30', NOW)).toBeNull();
  expect(normalizeBirthdate('2030-01-01', NOW)).toBeNull();
  expect(normalizeBirthdate('yesterday', NOW)).toBeNull();
});

test('validateIdForm checks each field and the number format per ID type', () => {
  expect(validateIdForm(form(), NOW)).toEqual({});
  expect(validateIdForm(form({ idType: 'DriversLicense', idNumber: 'N01-23-456789' }), NOW)).toEqual({});
  expect(validateIdForm(form({ idType: 'UMID', idNumber: '0111-2345678-9' }), NOW)).toEqual({});
  expect(validateIdForm(form({ idType: 'Passport', idNumber: 'p1234567a' }), NOW)).toEqual({});
  expect(validateIdForm(form({ idType: 'Passport', idNumber: '123456789' }), NOW).idNumber).toBeDefined();
  expect(validateIdForm(form({ idType: 'DriversLicense' }), NOW).idNumber).toBeDefined();
  expect(Object.keys(validateIdForm(
    { fullName: 'Ana', birthdate: 'x', idType: null, idNumber: '', address: 'n/a', sex: null }, NOW,
  )).sort()).toEqual(['address', 'birthdate', 'fullName', 'idType', 'sex']);
});

test('namesMatch is loose about case, accents, spaces, order and middle names', () => {
  expect(namesMatch('ANA  SANTOS   CRUZ', 'ana cruz')).toBe(true);
  expect(namesMatch('Cruz, Ana Santos', 'Ana Cruz')).toBe(true);
  expect(namesMatch('Ana S. Cruz', 'Ana Santos Cruz')).toBe(true);
  expect(namesMatch('Niño Peñaflor', 'Nino Penaflor')).toBe(true);
  expect(namesMatch('Juan Dela Cruz Jr.', 'Juan dela Cruz')).toBe(true);
  expect(namesMatch('Ana Cruz', 'Maria Cruz')).toBe(false);
  expect(namesMatch('Ana Cruz', 'Ana Reyes')).toBe(false);
  expect(namesMatch('Ana', 'Ana Cruz')).toBe(false); // one word is not enough
});

describe('on the phone', () => {
  test('runDeviceChecks gives pass/fail for details, age and name', () => {
    expect(runDeviceChecks(form(), 'Ana Cruz', NOW)).toEqual(PASS);
    expect(runDeviceChecks(form({ birthdate: '2010-05-05' }), 'Ana Cruz', NOW)).toMatchObject({ isAdult: false });
    expect(runDeviceChecks(form(), 'Maria Reyes', NOW)).toMatchObject({ nameMatches: false });
    expect(runDeviceChecks(form({ idNumber: '123' }), 'Ana Cruz', NOW)).toMatchObject({ formValid: false });
  });

  test('18th birthday today passes the age check, one day short fails', () => {
    expect(runDeviceChecks(form({ birthdate: '2008-10-10' }), 'Ana Cruz', NOW).isAdult).toBe(true);
    expect(runDeviceChecks(form({ birthdate: '2008-10-11' }), 'Ana Cruz', NOW).isAdult).toBe(false);
  });

  test('a missing address or sex makes the details invalid', () => {
    expect(runDeviceChecks(form({ address: '' }), 'Ana Cruz', NOW).formValid).toBe(false);
    expect(runDeviceChecks(form({ sex: null }), 'Ana Cruz', NOW).formValid).toBe(false);
  });

  test('the request carries no name, birthdate, address, sex, ID type or ID number', () => {
    const request = buildVerificationRequest(form(), 'Ana Cruz', NOW);
    expect(Object.keys(request).sort()).toEqual(['checks', 'idHash']);
    expect(Object.keys(request.checks).sort()).toEqual(['formValid', 'isAdult', 'nameMatches']);
    const sent = JSON.stringify(request);
    for (const raw of ['Ana', 'Cruz', '2000', '1234', '3456', 'PhilSys', 'Purok', 'Libertad', 'Butuan', 'Female']) {
      expect(sent).not.toContain(raw);
    }
  });

  test('idHash is SHA-256 of "type:normalized number", the same however the number was typed', () => {
    const request = buildVerificationRequest(form(), 'Ana Cruz', NOW);
    expect(idHashInput('PhilSys', '1234-5678-9012-3456')).toBe('PhilSys:1234567890123456');
    expect(request.idHash).toBe(createHash('sha256').update('PhilSys:1234567890123456').digest('hex'));
    expect(buildVerificationRequest(form({ idNumber: '1234 5678 9012 3456' }), 'Ana Cruz', NOW).idHash).toBe(request.idHash);
    // Same number under another ID type is a different ID.
    expect(buildVerificationRequest(form({ idType: 'UMID', idNumber: '123456789012' }), 'Ana Cruz', NOW).idHash)
      .not.toBe(buildVerificationRequest(form({ idType: 'PhilSys', idNumber: '123456789012' }), 'Ana Cruz', NOW).idHash);
  });
});

describe('on the server', () => {
  test('parseVerificationRequest accepts only a hex hash and three booleans', () => {
    const good = buildVerificationRequest(form(), 'Ana Cruz', NOW);
    expect(parseVerificationRequest(good)).toEqual({ ...good, livenessPassed: false });
    expect(parseVerificationRequest({ ...good, livenessPassed: true })?.livenessPassed).toBe(true);
    expect(parseVerificationRequest({ ...good, idHash: '1234567890123456' })).toBeNull(); // a raw number is refused
    expect(parseVerificationRequest({ ...good, idHash: good.idHash.toUpperCase() })).toBeNull();
    expect(parseVerificationRequest({ ...good, checks: { ...good.checks, isAdult: 'yes' } })).toBeNull();
    expect(parseVerificationRequest({ idHash: good.idHash })).toBeNull();
    expect(parseVerificationRequest(undefined)).toBeNull();
  });

  test('all checks passed and a new ID is verified', () => {
    expect(decide()).toEqual({ status: 'verified' });
  });

  test('there is no flagged outcome: every failure is a rejection with a reason', () => {
    expect(decide({ checks: { ...PASS, formValid: false } })).toMatchObject({ status: 'rejected', reason: 'invalid' });
    expect(decide({ checks: { ...PASS, isAdult: false } })).toMatchObject({ status: 'rejected', reason: 'underage' });
    expect(decide({ checks: { ...PASS, nameMatches: false } })).toEqual({
      status: 'rejected', reason: 'nameMismatch', message: "Name doesn't match your account",
    });
    expect(decide({ idAlreadyRegistered: true })).toEqual({
      status: 'rejected', reason: 'duplicate', message: 'This ID is already registered.',
    });
  });

  test('more than 5 attempts in 24 hours locks out, with the hours until it lifts', () => {
    const five = [23, 10, 5, 2, 1].map(hoursAgo);
    expect(five).toHaveLength(MAX_VERIFY_ATTEMPTS);
    expect(decide({ attemptTimes: five })).toEqual({
      status: 'rejected', reason: 'locked', message: 'Too many attempts. Try again in 1 hour.', retryAfterHours: 1,
    });
    expect(decide({ attemptTimes: [10, 9, 8, 7, 6].map(hoursAgo) })).toMatchObject({ reason: 'locked', retryAfterHours: 14 });
    // Four recent attempts: the fifth is still allowed.
    expect(decide({ attemptTimes: [10, 5, 2, 1].map(hoursAgo) }).status).toBe('verified');
  });

  test('the lockout comes before every other result, including failed checks', () => {
    expect(decide({ attemptTimes: [5, 4, 3, 2, 1].map(hoursAgo), checks: { ...PASS, isAdult: false } }))
      .toMatchObject({ reason: 'locked' });
  });

  test('the lockout lifts by itself when attempts leave the 24-hour window', () => {
    expect(decide({ attemptTimes: [30, 29, 28, 27, 26].map(hoursAgo) }).status).toBe('verified');
    expect(decide({ attemptTimes: [25, 10, 5, 2, 1].map(hoursAgo) }).status).toBe('verified');
  });

  test('liveness is off by default; when required, verified needs a passed check', () => {
    expect(decide({ livenessPassed: false }).status).toBe('verified');
    expect(decide({ livenessRequired: true })).toMatchObject({ status: 'rejected', reason: 'liveness' });
    expect(decide({ livenessRequired: true, livenessPassed: true }).status).toBe('verified');
  });
});
