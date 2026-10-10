import { router } from 'expo-router';
import { useState } from 'react';

import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { FormError } from '@/components/ui/form-error';
import { FormTitle } from '@/components/ui/form-title';
import { PromptLink } from '@/components/ui/prompt-link';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { authErrorMessage, useAuth } from '@/context/auth';
import { validateSignup, type SignupInput } from '@/core/userProfile';

type Form = SignupInput & { confirmPassword: string };

export default function RegisterScreen() {
  const { register } = useAuth();
  const [form, setForm] = useState<Form>({ fullName: '', email: '', contact: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key: keyof Form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async () => {
    const found: Partial<Record<keyof Form, string>> = validateSignup(form);
    if (form.confirmPassword !== form.password) found.confirmPassword = 'Passwords do not match';
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
      <BackButton />
      <FormTitle title="Create Your Account" subtitle="One account lets you both rent and lend." />

      <TextField
        label="Full Name"
        required
        placeholder="Enter your full name"
        value={form.fullName}
        onChangeText={set('fullName')}
        autoComplete="name"
        error={errors.fullName}
      />
      <TextField
        label="Email"
        required
        placeholder="Enter your email"
        value={form.email}
        onChangeText={set('email')}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        error={errors.email}
      />
      <TextField
        label="Mobile Number"
        required
        placeholder="09171234567"
        value={form.contact}
        onChangeText={set('contact')}
        autoComplete="tel"
        keyboardType="phone-pad"
        error={errors.contact}
      />
      <TextField
        label="Password"
        required
        placeholder="Create a password"
        value={form.password}
        onChangeText={set('password')}
        autoCapitalize="none"
        autoComplete="new-password"
        secureTextEntry
        error={errors.password}
      />
      <TextField
        label="Confirm Password"
        required
        placeholder="Re-type password"
        value={form.confirmPassword}
        onChangeText={set('confirmPassword')}
        autoCapitalize="none"
        autoComplete="new-password"
        secureTextEntry
        error={errors.confirmPassword}
      />
      <FormError message={error} />

      <Button title="Register Account" onPress={submit} loading={busy} />
      <PromptLink prompt="Already have an account?" action="Log in here" onPress={() => router.back()} />
    </Screen>
  );
}
