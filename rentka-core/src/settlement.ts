export const DEPOSIT_COVER_DAYS = 7;
export const DAY_MS = 24 * 60 * 60 * 1000;

const money = (n: number) => Math.round(n * 100) / 100;

/** Deposit = daily rate x 7 (the 7-day cover). */
export const depositFor = (dailyRate: number) => money(dailyRate * DEPOSIT_COVER_DAYS);

/** Covered until start + 7 days, plus 7 more days per approved extension. */
export const coveredUntil = (startMs: number, approvedExtensions = 0) =>
  startMs + (1 + approvedExtensions) * DEPOSIT_COVER_DAYS * DAY_MS;

export const isOverdue = (nowMs: number, coveredUntilMs: number, returned: boolean) =>
  !returned && nowMs > coveredUntilMs;

/** Day 6 of the current cover window: time to send the "return or extend" reminder. */
export const needsReminder = (nowMs: number, coveredUntilMs: number, returned: boolean) =>
  !returned && nowMs >= coveredUntilMs - DAY_MS && nowMs <= coveredUntilMs;

/** 24-hour blocks, rounded up, minimum 1 day. Document this rule in the paper. */
export const daysUsed = (startMs: number, returnedMs: number) =>
  Math.max(1, Math.ceil((returnedMs - startMs) / DAY_MS));

export interface Settlement {
  daysUsed: number;
  finalCost: number;
  depositTotal: number;
  balance: number; // depositTotal - finalCost
  direction: 'refund' | 'owed' | 'even';
}

export function settle(p: {
  dailyRate: number;
  depositTotal: number;
  startMs: number;
  returnedMs: number;
}): Settlement {
  const days = daysUsed(p.startMs, p.returnedMs);
  const finalCost = money(days * p.dailyRate);
  const balance = money(p.depositTotal - finalCost);
  return {
    daysUsed: days,
    finalCost,
    depositTotal: p.depositTotal,
    balance,
    direction: balance > 0 ? 'refund' : balance < 0 ? 'owed' : 'even',
  };
}
