export type RentalStatus =
  | 'pending' | 'accepted' | 'active' | 'returned' | 'completed' | 'cancelled' | 'disputed';
export type Role = 'lender' | 'borrower';
export type Action =
  | 'accept' | 'submitPaymentProof' | 'confirmHandoff' | 'requestExtension'
  | 'approveExtension' | 'confirmReturn' | 'cancel' | 'dispute';

interface Rule { from: RentalStatus[]; roles: Role[]; to: RentalStatus }

// 'request' (creating the rental, status = pending) is handled separately by rentalAction.
export const RULES: Record<Action, Rule> = {
  accept:             { from: ['pending'],               roles: ['lender'],             to: 'accepted' },
  submitPaymentProof: { from: ['accepted'],              roles: ['borrower'],           to: 'accepted' },
  confirmHandoff:     { from: ['accepted'],              roles: ['lender'],             to: 'active' },
  requestExtension:   { from: ['active'],                roles: ['borrower'],           to: 'active' },
  approveExtension:   { from: ['active'],                roles: ['lender'],             to: 'active' },
  confirmReturn:      { from: ['active'],                roles: ['lender'],             to: 'returned' },
  cancel:             { from: ['pending', 'accepted'],   roles: ['lender', 'borrower'], to: 'cancelled' },
  dispute:            { from: ['active', 'returned'],    roles: ['lender', 'borrower'], to: 'disputed' },
};

export function nextStatus(action: Action, from: RentalStatus, role: Role): RentalStatus | null {
  const r = RULES[action];
  return r.from.includes(from) && r.roles.includes(role) ? r.to : null;
}

/** Item is hidden from listings from acceptance until it is returned. */
export function itemStatusFor(status: RentalStatus): 'rented' | 'available' {
  return status === 'accepted' || status === 'active' || status === 'disputed' ? 'rented' : 'available';
}

/** Completed only when both sides have rated a returned rental. */
export const isComplete = (ratedByLender: boolean, ratedByBorrower: boolean) =>
  ratedByLender && ratedByBorrower;

/** new = (old * count + rating) / (count + 1), 2 decimals. */
export function newTrustScore(oldScore: number, count: number, rating: number): number {
  return Math.round(((oldScore * count + rating) / (count + 1)) * 100) / 100;
}
