import { router } from 'expo-router';
import { useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { authErrorMessage, useAuth } from '@/context/auth';
import { validateSignup, type SignupInput } from '@/core/userProfile';

export default function RegisterScreen() {
  const { register } = useAuth();
  const [form, setForm] = useState<SignupInput>({ fullName: '', email: '', contact: '', password: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof SignupInput, string>>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key: keyof SignupInput) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async () => {
    const found = validateSignup(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setError('');
    setBusy(true);
    try {
      await register(form);
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <ThemedText type="subtitle">Create account</ThemedText>
      <ThemedText themeColor="textSecondary">One account lets you both rent and lend.</ThemedText>

      <TextField
        label="Full name"
        value={form.fullName}
        onChangeText={set('fullName')}
        autoComplete="name"
        error={errors.fullName}
      />
      <TextField
        label="Email"
        value={form.email}
        onChangeText={set('email')}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        error={errors.email}
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
      <TextField
        label="Password"
        value={form.password}
        onChangeText={set('password')}
        autoCapitalize="none"
        autoComplete="new-password"
        secureTextEntry
        error={errors.password}
      />
      {error ? (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      ) : null}

      <Button title="Create account" onPress={submit} loading={busy} />
      <Button title="I already have an account" variant="secondary" onPress={() => router.back()} disabled={busy} />
    </Screen>
  );
}
