import { router } from 'expo-router';
import { useState } from 'react';

import { RoleChoice } from '@/components/role-choice';
import { TERMS_REQUIRED, TermsCheckbox } from '@/components/terms-checkbox';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { FormError } from '@/components/ui/form-error';
import { FormTitle } from '@/components/ui/form-title';
import { PromptLink } from '@/components/ui/prompt-link';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { authErrorMessage, useAuth } from '@/context/auth';
import { validateSignup, type RoleChoice as Choice, type SignupInput } from '@/core/userProfile';

type Form = SignupInput & { confirmPassword: string; terms: boolean };
type TextKey = 'fullName' | 'email' | 'contact' | 'password' | 'confirmPassword';

export default function RegisterScreen() {
  const { register } = useAuth();
  const [form, setForm] = useState<Form>({
    fullName: '', email: '', contact: '', password: '', confirmPassword: '', role: null, terms: false,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key: TextKey) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async () => {
    const found: Partial<Record<keyof Form, string>> = validateSignup(form);
    if (form.confirmPassword !== form.password) found.confirmPassword = 'Passwords do not match';
    if (!form.terms) found.terms = TERMS_REQUIRED;
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
      <FormTitle title="Create Your Account" />

      <TextField
        label="Full Name"
        required
        placeholder="Enter your full name, as on your ID"
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
      <RoleChoice
        value={form.role}
        onChange={(role: Choice) => setForm((f) => ({ ...f, role }))}
        error={errors.role}
      />
      <TermsCheckbox
        checked={form.terms}
        onChange={(terms) => setForm((f) => ({ ...f, terms }))}
        error={errors.terms}
      />
      <FormError message={error} />

      <Button title="Register your Account" onPress={submit} loading={busy} />
      <PromptLink prompt="Already have an account?" action="Log in here" onPress={() => router.back()} />
    </Screen>
  );
}
