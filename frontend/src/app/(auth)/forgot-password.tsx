import { useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { FormError } from '@/components/ui/form-error';
import { FormTitle } from '@/components/ui/form-title';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { authErrorMessage, useAuth } from '@/context/auth';
import { isValidEmail } from '@/core/userProfile';

export default function ForgotPasswordScreen() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (e) {
      const code = (e as { code?: string })?.code;
      // Do not reveal whether an email has an account.
      if (code === 'auth/user-not-found') setSent(true);
      else setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <BackButton />
      <FormTitle title="Forgot Password" subtitle="Enter your email and we will send a link to reset your password." />

      <TextField
        label="Email"
        placeholder="Enter your email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        onSubmitEditing={submit}
      />
      <FormError message={error} />
      {sent ? (
        <ThemedText type="small" themeColor="primary">
          If this email has a RentKa account, a reset link has been sent. Check your inbox and spam folder.
        </ThemedText>
      ) : null}

      <Button title={sent ? 'Send again' : 'Send reset link'} onPress={submit} loading={busy} />
    </Screen>
  );
}
