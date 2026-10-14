import { useState } from 'react';

import { RoleChoice } from '@/components/role-choice';
import { TERMS_REQUIRED, TermsCheckbox } from '@/components/terms-checkbox';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { FormError } from '@/components/ui/form-error';
import { FormTitle } from '@/components/ui/form-title';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { authErrorMessage, useAuth } from '@/context/auth';
import { validateProfile, type ProfileInput } from '@/core/userProfile';

type Form = ProfileInput & { terms: boolean };

/**
 * "Complete your profile": shown when an account has no users/{uid} profile yet, mainly right after
 * Continue with Google (the name comes from Google and stays editable). Back signs out.
 */
export default function CompleteProfileScreen() {
  const { user, saveProfile, signOut } = useAuth();
  const [form, setForm] = useState<Form>({ fullName: user?.displayName ?? '', contact: '', role: null, terms: false });
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key: 'fullName' | 'contact') => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async () => {
    const found: Partial<Record<keyof Form, string>> = validateProfile(form);
    if (!form.terms) found.terms = TERMS_REQUIRED;
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setError('');
    setBusy(true);
    try {
      await saveProfile(form);
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <BackButton onPress={signOut} />
      <FormTitle title="Complete Your Profile" subtitle={`Signed in as ${user?.email ?? 'your account'}`} />

      <TextField
        tone="surface"
        label="Full Name"
        required
        placeholder="Enter your full name, as on your ID"
        value={form.fullName}
        onChangeText={set('fullName')}
        autoComplete="name"
        error={errors.fullName}
      />
      <TextField
        tone="surface"
        label="Contact Number"
        required
        placeholder="09171234567"
        value={form.contact}
        onChangeText={set('contact')}
        autoComplete="tel"
        keyboardType="phone-pad"
        error={errors.contact}
      />
      <RoleChoice tone="surface" value={form.role} onChange={(role) => setForm((f) => ({ ...f, role }))} error={errors.role} />
      <TermsCheckbox
        checked={form.terms}
        onChange={(terms) => setForm((f) => ({ ...f, terms }))}
        error={errors.terms}
      />
      <FormError message={error} />

      <Button title="Continue" onPress={submit} loading={busy} />
    </Screen>
  );
}
