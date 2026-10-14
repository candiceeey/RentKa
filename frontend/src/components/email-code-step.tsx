import { useEffect, useRef, useState } from 'react';

import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { FormError } from '@/components/ui/form-error';
import { FormTitle } from '@/components/ui/form-title';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { TextLink } from '@/components/ui/text-link';
import { authErrorMessage, useAuth } from '@/context/auth';
import { EMAIL_CODE_LENGTH, EMAIL_CODE_TTL_MINUTES, isEmailCode } from '@/core/emailCode';

type EmailCodeStepProps = {
  onVerified: () => void;
  onLeave: () => void;
};

/** Seconds to wait, from a "resend too soon" error (the function sends retryAfterSeconds). */
const retryAfter = (e: unknown) => (e as { details?: { retryAfterSeconds?: number } })?.details?.retryAfterSeconds;

/**
 * "Verify Your Email": sends a 6-digit code when it opens, then checks the typed code with the functions.
 * Only verifyEmailCode can mark the email verified; this screen just shows its answers.
 */
export function EmailCodeStep({ onVerified, onLeave }: EmailCodeStepProps) {
  const { user, sendEmailCode, verifyEmailCode } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const sentOnOpen = useRef(false);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const send = async () => {
    setError('');
    setBusy(true);
    try {
      const result = await sendEmailCode();
      if (result.status === 'alreadyVerified') {
        onVerified();
        return;
      }
      setNotice(`We sent a ${EMAIL_CODE_LENGTH}-digit code to ${user?.email}. It expires in ${EMAIL_CODE_TTL_MINUTES} minutes.`);
      setResendIn(result.resendInSeconds);
      setCode('');
    } catch (e) {
      const wait = retryAfter(e);
      // A code was sent less than a minute ago (for example, the screen was reopened): keep using it.
      if (wait) {
        setNotice(`A code was sent to ${user?.email} a moment ago. Check your inbox and spam folder.`);
        setResendIn(wait);
      } else {
        setError(authErrorMessage(e));
      }
    } finally {
      setBusy(false);
    }
  };

  // Send the first code as soon as the screen opens.
  useEffect(() => {
    if (sentOnOpen.current) return;
    sentOnOpen.current = true;
    send();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verify = async () => {
    if (!isEmailCode(code)) {
      setError(`Enter the ${EMAIL_CODE_LENGTH}-digit code from the email.`);
      return;
    }
    setError('');
    setBusy(true);
    try {
      const result = await verifyEmailCode(code);
      if (result.status === 'verified') {
        onVerified();
        return;
      }
      setError(result.message);
      if (result.status !== 'wrong' || result.triesLeft === 0) setCode('');
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <BackButton onPress={onLeave} />
      <FormTitle title="Verify Your Email" subtitle="Enter the code we emailed you to continue." />
      {notice ? <Notice message={notice} /> : null}
      <TextField
        tone="surface"
        label="Verification code"
        placeholder={'0'.repeat(EMAIL_CODE_LENGTH)}
        value={code}
        onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, EMAIL_CODE_LENGTH))}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        maxLength={EMAIL_CODE_LENGTH}
        onSubmitEditing={verify}
      />
      <FormError message={error} />
      <Button title="Verify" onPress={verify} loading={busy} />
      <Button
        title={resendIn > 0 ? `Resend code (${resendIn}s)` : 'Resend code'}
        variant="outline"
        onPress={send}
        disabled={busy || resendIn > 0}
      />
      <TextLink align="center" onPress={onLeave}>
        Not now
      </TextLink>
    </Screen>
  );
}
