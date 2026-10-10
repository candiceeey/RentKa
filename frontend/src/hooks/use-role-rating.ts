import { useAuth } from '@/context/auth';
import { useMode } from '@/context/mode';
import { INITIAL_TRUST_SCORE, ratingFieldsFor } from '@/core/stateMachine';

/** The signed-in user's rating for the active role only. Lender and borrower ratings are never combined. */
export function useRoleRating() {
  const { profile } = useAuth();
  const { mode } = useMode();
  const fields = ratingFieldsFor(mode);

  return {
    mode,
    score: profile?.[fields.score] ?? INITIAL_TRUST_SCORE,
    count: profile?.[fields.count] ?? 0,
  };
}
