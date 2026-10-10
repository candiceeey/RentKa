import { useState } from 'react';

import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { FormError } from '@/components/ui/form-error';
import { FormTitle } from '@/components/ui/form-title';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { authErrorMessage, useAuth } from '@/context/auth';
import { validateProfile, type ProfileInput } from '@/core/userProfile';

/** Shown when an account exists but its users/{uid} profile was never saved. Back signs out. */
export default function CompleteProfileScreen() {
  const { user, saveProfile, signOut } = useAuth();
  const [form, setForm] = useState<ProfileInput>({ fullName: '', contact: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileInput, string>>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key: keyof ProfileInput) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async () => {
    const found = validateProfile(form);
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
      <FormTitle title="Set Up Profile" subtitle={`Signed in as ${user?.email ?? 'your account'}`} />

      <TextField
        tone="surface"
        label="Full Name"
        placeholder="Enter your full name"
        value={form.fullName}
        onChangeText={set('fullName')}
        autoComplete="name"
        error={errors.fullName}
      />
      <TextField
        tone="surface"
        label="Contact Number"
        placeholder="09171234567"
        value={form.contact}
        onChangeText={set('contact')}
        autoComplete="tel"
        keyboardType="phone-pad"
        error={errors.contact}
      />
      <FormError message={error} />

      <Button title="Save" onPress={submit} loading={busy} />
    </Screen>
  );
}
