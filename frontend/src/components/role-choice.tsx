import { ChoiceGroup } from '@/components/ui/choice-group';
import { type RoleChoice as Choice } from '@/core/userProfile';

const OPTIONS: { value: Choice; label: string }[] = [
  { value: 'borrower', label: 'Borrower' },
  { value: 'lender', label: 'Lender' },
  { value: 'both', label: 'Both' },
];

type RoleChoiceProps = {
  value: Choice | null;
  onChange: (value: Choice) => void;
  error?: string;
};

/** "Sign up as": the account gets only the roles chosen here. The other one can be added later in Profile. */
export function RoleChoice({ value, onChange, error }: RoleChoiceProps) {
  return <ChoiceGroup label="Sign up as" required options={OPTIONS} value={value} onChange={onChange} error={error} />;
}
