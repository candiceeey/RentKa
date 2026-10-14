import { Select } from '@/components/ui/select';
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
  tone?: 'surface' | 'muted';
};

/** "Sign up as" dropdown: the account gets only the roles chosen here. The other one can be added later in Profile. */
export function RoleChoice({ value, onChange, error, tone }: RoleChoiceProps) {
  return (
    <Select
      label="Sign up as"
      required
      placeholder="Select user type"
      options={OPTIONS}
      value={value}
      onChange={onChange}
      error={error}
      tone={tone}
    />
  );
}
