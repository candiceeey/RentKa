import { router } from 'expo-router';

import { Checkbox } from '@/components/ui/checkbox';
import { TextLink } from '@/components/ui/text-link';

export const TERMS_REQUIRED = 'Tick the box to agree to the Terms and Conditions.';

type TermsCheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
};

/** "By clicking this, you agree to the Terms and Conditions". Asked once, at registration. */
export function TermsCheckbox({ checked, onChange, error }: TermsCheckboxProps) {
  return (
    <Checkbox checked={checked} onChange={onChange} error={error}>
      By clicking this, you agree to the <TextLink onPress={() => router.push('/terms')}>Terms and Conditions</TextLink>
    </Checkbox>
  );
}
