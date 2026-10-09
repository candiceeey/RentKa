import { useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { authErrorMessage, useAuth } from '@/context/auth';
import { validateProfile, type ProfileInput } from '@/core/userProfile';

/** Shown when an account exists but its users/{uid} profile was never saved. */
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
      <ThemedText type="subtitle">Finish your profile</ThemedText>
      <ThemedText themeColor="textSecondary">Signed in as {user?.email}. Add your details to continue.</ThemedText>

      <TextField
        label="Full name"
        value={form.fullName}
        onChangeText={set('fullName')}
        autoComplete="name"
        error={errors.fullName}
      />
      <TextField
        label="Mobile number"
        value={form.contact}
        onChangeText={set('contact')}
        placeholder="09171234567"
        autoComplete="tel"
        keyboardType="phone-pad"
        error={errors.contact}
      />
      {error ? (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      ) : null}

      <Button title="Save" onPress={submit} loading={busy} />
      <Button title="Sign out" variant="secondary" onPress={signOut} disabled={busy} />
    </Screen>
  );
}
