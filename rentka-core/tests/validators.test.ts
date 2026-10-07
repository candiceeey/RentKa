import { isAdult, isValidImei, maskUniqueId, normalizeUniqueId, validateUniqueId } from '../src/validators';

test('IMEI: valid number passes Luhn, altered number fails', () => {
  expect(isValidImei('490154203237518')).toBe(true);
  expect(isValidImei('490154203237519')).toBe(false);
  expect(isValidImei('49015420323751')).toBe(false); // 14 digits
  expect(isValidImei('49-0154 2032 37518')).toBe(true); // separators allowed
});

test('normalization makes duplicates detectable', () => {
  expect(normalizeUniqueId('SERIAL', ' ab-12 34 ')).toBe('AB1234');
  expect(normalizeUniqueId('IMEI', '490154 203237518')).toBe('490154203237518');
  expect(normalizeUniqueId('MARK', '  Red   sticker  ')).toBe('red sticker');
});

test('validateUniqueId', () => {
  expect(validateUniqueId('IMEI', '490154203237518')).toBeNull();
  expect(validateUniqueId('IMEI', '123')).not.toBeNull();
  expect(validateUniqueId('SERIAL', 'AB')).not.toBeNull();
  expect(validateUniqueId('SERIAL', 'SN-98231')).toBeNull();
  expect(validateUniqueId('MARK', 'Red tape on handle')).toBeNull();
  expect(validateUniqueId('MARK', '')).toBe('Required');
});

test('masking keeps only the last 4 characters', () => {
  expect(maskUniqueId('490154203237518')).toBe('•••••••••••7518');
  expect(maskUniqueId('AB1')).toBe('•••');
});

test('isAdult handles the birthday boundary', () => {
  const today = new Date(Date.UTC(2026, 9, 7)); // 7 Oct 2026
  expect(isAdult('2008-10-07', today)).toBe(true);  // turns 18 today
  expect(isAdult('2008-10-08', today)).toBe(false); // turns 18 tomorrow
  expect(isAdult('1999-01-05', today)).toBe(true);
  expect(isAdult('not-a-date', today)).toBe(false);
});
