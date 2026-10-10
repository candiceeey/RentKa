import { router } from 'expo-router';
import { useState } from 'react';

import { BrandLogo } from '@/components/brand-logo';
import { Button } from '@/components/ui/button';
import { FormError } from '@/components/ui/form-error';
import { FormTitle } from '@/components/ui/form-title';
import { PromptLink } from '@/components/ui/prompt-link';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { authErrorMessage, useAuth } from '@/context/auth';
import { isValidEmail } from '@/core/userProfile';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!isValidEmail(email) || !password) {
      setError('Enter your email and password.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      await signIn(email, password);
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen hero={<BrandLogo />}>
      <FormTitle title="Welcome back!" size="title" />

      <TextField
        tone="surface"
        placeholder="Enter your email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
      />
      <TextField
        tone="surface"
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        autoCapitalize="none"
        autoComplete="current-password"
        secureTextEntry
        onSubmitEditing={submit}
      />
      <FormError message={error} />

      <Button title="Sign In" onPress={submit} loading={busy} />
      <PromptLink prompt="Don't have an account?" action="Sign Up" onPress={() => router.push('/register')} />
    </Screen>
  );
}
