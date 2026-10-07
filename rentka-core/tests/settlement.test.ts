import { coveredUntil, daysUsed, depositFor, DAY_MS, isOverdue, needsReminder, settle } from '../src/settlement';

const start = Date.UTC(2026, 9, 7, 8, 0, 0);

test('deposit = daily rate x 7', () => {
  expect(depositFor(150)).toBe(1050);
});

test('days used: 24h blocks rounded up, minimum 1', () => {
  expect(daysUsed(start, start + 60_000)).toBe(1);          // 1 minute
  expect(daysUsed(start, start + DAY_MS)).toBe(1);          // exactly 24h
  expect(daysUsed(start, start + DAY_MS + 1)).toBe(2);      // 24h + 1ms
  expect(daysUsed(start, start + 6.5 * DAY_MS)).toBe(7);
});

test('settlement: under-use gives a refund', () => {
  const s = settle({ dailyRate: 150, depositTotal: 1050, startMs: start, returnedMs: start + 3 * DAY_MS });
  expect(s).toMatchObject({ daysUsed: 3, finalCost: 450, balance: 600, direction: 'refund' });
});

test('settlement: exactly 7 days is even', () => {
  const s = settle({ dailyRate: 150, depositTotal: 1050, startMs: start, returnedMs: start + 7 * DAY_MS });
  expect(s).toMatchObject({ daysUsed: 7, finalCost: 1050, balance: 0, direction: 'even' });
});

test('settlement: over-use without extension means the borrower owes the difference', () => {
  const s = settle({ dailyRate: 150, depositTotal: 1050, startMs: start, returnedMs: start + 9 * DAY_MS });
  expect(s).toMatchObject({ daysUsed: 9, finalCost: 1350, balance: -300, direction: 'owed' });
});

test('settlement: an approved top-up covers the longer rental', () => {
  const s = settle({ dailyRate: 150, depositTotal: 2100, startMs: start, returnedMs: start + 9 * DAY_MS });
  expect(s).toMatchObject({ balance: 750, direction: 'refund' });
});

test('covered window, extension, reminder and overdue', () => {
  const c1 = coveredUntil(start, 0);
  expect(c1).toBe(start + 7 * DAY_MS);
  expect(coveredUntil(start, 1)).toBe(start + 14 * DAY_MS);
  expect(needsReminder(start + 5 * DAY_MS, c1, false)).toBe(false);
  expect(needsReminder(start + 6.2 * DAY_MS, c1, false)).toBe(true);
  expect(isOverdue(start + 7 * DAY_MS + 1, c1, false)).toBe(true);
  expect(isOverdue(start + 8 * DAY_MS, c1, true)).toBe(false); // already returned
});
