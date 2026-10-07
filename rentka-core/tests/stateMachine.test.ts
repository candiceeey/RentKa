import { isComplete, itemStatusFor, newTrustScore, nextStatus } from '../src/stateMachine';
import { parseId } from '../src/idParse';

test('happy path transitions', () => {
  expect(nextStatus('accept', 'pending', 'lender')).toBe('accepted');
  expect(nextStatus('confirmHandoff', 'accepted', 'lender')).toBe('active');
  expect(nextStatus('confirmReturn', 'active', 'lender')).toBe('returned');
});

test('wrong role or wrong state is rejected', () => {
  expect(nextStatus('accept', 'pending', 'borrower')).toBeNull();
  expect(nextStatus('confirmHandoff', 'pending', 'lender')).toBeNull();
  expect(nextStatus('confirmReturn', 'accepted', 'lender')).toBeNull();
  expect(nextStatus('cancel', 'active', 'borrower')).toBeNull();
});

test('either side can cancel before handoff and dispute after', () => {
  expect(nextStatus('cancel', 'pending', 'borrower')).toBe('cancelled');
  expect(nextStatus('cancel', 'accepted', 'lender')).toBe('cancelled');
  expect(nextStatus('dispute', 'active', 'borrower')).toBe('disputed');
});

test('item is hidden from acceptance until return', () => {
  expect(itemStatusFor('pending')).toBe('available');
  expect(itemStatusFor('accepted')).toBe('rented');
  expect(itemStatusFor('active')).toBe('rented');
  expect(itemStatusFor('disputed')).toBe('rented');
  expect(itemStatusFor('returned')).toBe('available');
  expect(itemStatusFor('cancelled')).toBe('available');
});

test('completion needs both ratings', () => {
  expect(isComplete(true, false)).toBe(false);
  expect(isComplete(true, true)).toBe(true);
});

test('trust score running average', () => {
  expect(newTrustScore(3, 0, 5)).toBe(5); // count 0: the first rating replaces the 3.00 default
  expect(newTrustScore(4, 3, 2)).toBe(3.5);
});

describe('parseId (heuristic OCR parser)', () => {
  const philsys = `REPUBLIKA NG PILIPINAS
PHILIPPINE IDENTIFICATION CARD
Apelyido/Last Name
DELA CRUZ
Mga Pangalan/Given Names
JUAN
Gitnang Apelyido/Middle Name
SANTOS
Petsa ng Kapanganakan/Date of Birth
JANUARY 05, 1999
1234-5678-9012-3456`;

  test('PhilSys-style text', () => {
    const p = parseId(philsys);
    expect(p).toMatchObject({
      idType: 'PhilSys', fullName: 'Juan Santos Dela Cruz',
      birthdate: '1999-01-05', idNumber: '1234567890123456', confidence: 'high', missing: [],
    });
  });

  test("driver's license style text", () => {
    const p = parseId(`LAND TRANSPORTATION OFFICE
DRIVER'S LICENSE
Last Name, First Name, Middle Name
Birth Date
1999/01/05
License No. N01-23-456789`);
    expect(p.idType).toBe('DriversLicense');
    expect(p.birthdate).toBe('1999-01-05');
    expect(p.idNumber).toBe('N01-23-456789');
  });

  test('garbage OCR gives low confidence and lists what is missing', () => {
    const p = parseId('xx ## blurry text');
    expect(p.confidence).toBe('low');
    expect(p.missing).toEqual(['fullName', 'birthdate', 'idNumber']);
  });
});
