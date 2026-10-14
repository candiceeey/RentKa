import { parseAddress, parseId, parseSex } from '../src/idParse';

const lines = (text: string) => text.split('\n');

test('parseSex reads English and Filipino labels and values', () => {
  expect(parseSex(lines('Sex: F'))).toBe('Female');
  expect(parseSex(lines('SEX M'))).toBeUndefined(); // no colon and nothing on the next line
  expect(parseSex(lines('Kasarian/Sex\nMALE'))).toBe('Male');
  expect(parseSex(lines('Kasarian/Sex\nBABAE'))).toBe('Female');
  expect(parseSex(lines('Sex: Female'))).toBe('Female');
  expect(parseSex(lines('Date of Birth: 1999/01/05'))).toBeUndefined();
});

test('parseAddress joins the lines after the label and stops at the next label', () => {
  expect(parseAddress(lines('Tirahan/Address\nPurok 2, Libertad\nButuan City, Agusan del Norte\nSex: M')))
    .toBe('Purok 2, Libertad, Butuan City, Agusan del Norte');
  expect(parseAddress(lines('Address: P2 BL13 L2 Lumina Homes, Taguibo\nButuan City')))
    .toBe('P2 BL13 L2 Lumina Homes, Taguibo, Butuan City');
  expect(parseAddress(lines('Address\nPurok No. 5, Ampayon\nDate of Birth: 1999/01/05'))).toBe('Purok No. 5, Ampayon');
  expect(parseAddress(lines('no address here'))).toBeUndefined();
});

test('parseId fills address and sex when the text has them, and they stay optional', () => {
  const p = parseId(`PHILIPPINE IDENTIFICATION CARD
Apelyido/Last Name
DELA CRUZ
Mga Pangalan/Given Names
JUAN
Petsa ng Kapanganakan/Date of Birth
JANUARY 05, 1999
Kasarian/Sex
MALE
Tirahan/Address
Purok 2, Libertad, Butuan City
1234-5678-9012-3456`);
  expect(p).toMatchObject({ sex: 'Male', address: 'Purok 2, Libertad, Butuan City', missing: [] });
  expect(parseId('xx ## blurry text')).toMatchObject({ address: undefined, sex: undefined });
});
