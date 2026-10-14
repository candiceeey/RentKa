import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DetailRow } from '@/components/ui/detail-row';
import { FormError } from '@/components/ui/form-error';
import { FormTitle } from '@/components/ui/form-title';
import { Notice } from '@/components/ui/notice';
import { ResultPanel } from '@/components/ui/result-panel';
import { Screen } from '@/components/ui/screen';
import { Select } from '@/components/ui/select';
import { TextField } from '@/components/ui/text-field';
import { TextLink } from '@/components/ui/text-link';
import { authErrorMessage, useAuth } from '@/context/auth';
import {
  ID_TYPES, SEX_OPTIONS, normalizeBirthdate, normalizeIdNumber, validateIdForm, type IdForm, type VerificationResult,
} from '@/core/identity';

/**
 * Email check, then the ID step: ID type -> (scan, face check: next app update) -> your ID details -> review -> result -> login.
 * The ID fields live only in this screen's memory and never leave the phone: verifyIdentity gets only a hash of the
 * ID type and number and pass/fail results (buildVerificationRequest in the core).
 */
type Step = 'email' | 'type' | 'form' | 'review' | 'result';

const RESEND_WAIT_SECONDS = 60;
const EMPTY_FORM: IdForm = { fullName: '', birthdate: '', idType: null, idNumber: '', address: '', sex: null };

export default function VerifyScreen() {
  const { user, profile, emailVerified, sendVerificationEmail, refreshEmailVerified, verifyIdentity, signOutToLogin } =
    useAuth();
  const [step, setStep] = useState<Step>(emailVerified ? 'type' : 'email');
  const [form, setForm] = useState<IdForm>({ ...EMPTY_FORM, fullName: profile?.fullName ?? '' });
  const [errors, setErrors] = useState<Partial<Record<keyof IdForm, string>>>({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(RESEND_WAIT_SECONDS);
  const [result, setResult] = useState<VerificationResult | null>(null);

  // Countdown before "Resend email" works again (the first email was sent at registration).
  useEffect(() => {
    if (step !== 'email' || resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [step, resendIn]);

  const set = (key: 'fullName' | 'birthdate' | 'idNumber' | 'address') => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));
  const idType = ID_TYPES.find((t) => t.value === form.idType);
  const leave = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const goToLogin = (verified: boolean) =>
    signOutToLogin(
      verified
        ? 'Your ID is verified. Log in again to continue.'
        : 'Log in again to continue. You can verify your ID later from the Verify now button.',
    );

  const run = async (action: () => Promise<void>) => {
    setError('');
    setBusy(true);
    try {
      await action();
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const checkEmail = () =>
    run(async () => {
      if (await refreshEmailVerified()) setStep('type');
      else setError('Your email is not verified yet. Open the link in the email first, then try again.');
    });

  const resend = () =>
    run(async () => {
      await sendVerificationEmail();
      setNotice(`We sent a new link to ${user?.email}.`);
      setResendIn(RESEND_WAIT_SECONDS);
    });

  const toForm = () => {
    if (!form.idType) {
      setErrors({ idType: 'Choose the type of ID' });
      return;
    }
    setErrors({});
    setStep('form');
  };

  const toReview = () => {
    const found = validateIdForm(form);
    setErrors(found);
    if (Object.keys(found).length === 0) setStep('review');
  };

  const submit = () =>
    run(async () => {
      setResult(await verifyIdentity(form));
      setStep('result');
    });

  if (step === 'email') {
    return (
      <Screen>
        <BackButton onPress={leave} />
        <FormTitle
          title="Verify Your Email"
          subtitle={`We sent a verification link to ${user?.email}. Open it, then come back and tap the button below.`}
        />
        {notice ? <Notice message={notice} /> : null}
        <FormError message={error} />
        <Button title="I've verified my email" onPress={checkEmail} loading={busy} />
        <Button
          title={resendIn > 0 ? `Resend email (${resendIn}s)` : 'Resend email'}
          variant="outline"
          onPress={resend}
          disabled={busy || resendIn > 0}
        />
        <TextLink align="center" onPress={leave}>
          Not now
        </TextLink>
      </Screen>
    );
  }

  if (step === 'result' && result) {
    const verified = result.status === 'verified';
    const locked = result.status === 'rejected' && result.reason === 'locked';
    return (
      <Screen>
        <ResultPanel
          tone={verified ? 'success' : 'danger'}
          title={verified ? "You're verified" : locked ? 'Try again later' : 'Not verified'}
          message={verified ? 'You can now list items, post requests and rent.' : result.message}
        />
        {!verified && !locked ? <Button title="Try again" onPress={() => setStep('form')} /> : null}
        <Button title="Go to Login" variant={verified ? 'primary' : 'outline'} onPress={() => goToLogin(verified)} />
      </Screen>
    );
  }

  if (step === 'review') {
    return (
      <Screen>
        <BackButton onPress={() => setStep('form')} />
        <FormTitle title="Review Your Details" subtitle="Make sure these match your ID exactly." />
        <Card>
          <DetailRow label="ID Type" value={idType?.label ?? '-'} />
          <DetailRow label="ID Number" value={normalizeIdNumber(form.idNumber)} />
          <DetailRow label="Full Name" value={form.fullName.trim()} />
          <DetailRow label="Address" value={form.address.trim()} />
          <DetailRow label="Sex" value={form.sex ?? '-'} />
          <DetailRow label="Birthdate" value={normalizeBirthdate(form.birthdate) ?? form.birthdate} last />
        </Card>
        <Notice message="These details are checked on this phone. Only a coded value of your ID number and the check results are sent. Nothing is saved." />
        <FormError message={error} />
        <Button title="Confirm and verify" onPress={submit} loading={busy} />
        <Button title="Edit details" variant="outline" onPress={() => setStep('form')} disabled={busy} />
      </Screen>
    );
  }

  if (step === 'form') {
    return (
      <Screen>
        <BackButton onPress={() => setStep('type')} />
        <FormTitle title="Your ID Details" subtitle={`${idType?.label}. Type them exactly as shown on your ID.`} />
        <TextField
          tone="surface"
          label="ID Number"
          required
          placeholder={idType?.example}
          value={form.idNumber}
          onChangeText={set('idNumber')}
          autoCapitalize="characters"
          autoCorrect={false}
          error={errors.idNumber}
        />
        <TextField
          tone="surface"
          label="Full Name"
          required
          placeholder="As shown on your ID"
          value={form.fullName}
          onChangeText={set('fullName')}
          autoComplete="name"
          error={errors.fullName}
        />
        <TextField
          tone="surface"
          label="Address"
          required
          placeholder="As shown on your ID"
          value={form.address}
          onChangeText={set('address')}
          multiline
          error={errors.address}
        />
        <Select
          tone="surface"
          label="Sex"
          required
          options={SEX_OPTIONS}
          value={form.sex}
          onChange={(sex) => setForm((f) => ({ ...f, sex }))}
          error={errors.sex}
        />
        <TextField
          tone="surface"
          label="Birthdate"
          required
          placeholder="YYYY-MM-DD"
          value={form.birthdate}
          onChangeText={set('birthdate')}
          keyboardType="numbers-and-punctuation"
          error={errors.birthdate}
        />
        <Button title="Next" onPress={toReview} />
      </Screen>
    );
  }

  return (
    <Screen>
      <BackButton onPress={leave} />
      <FormTitle
        title="Verify Your Identity"
        subtitle="This keeps our community safe. Your ID details are checked on this phone and never uploaded or saved."
      />
      <Select
        tone="surface"
        label="ID Type"
        required
        placeholder="Choose your ID"
        options={ID_TYPES}
        value={form.idType}
        onChange={(value) => setForm((f) => ({ ...f, idType: value }))}
        error={errors.idType}
      />
      {/* Stage 2 (native rebuild) adds "Scan your ID" and the face check here; manual entry stays as the fallback. */}
      <Notice message="Scanning your ID and the face check arrive with the next app update. For now, enter your details by hand." />
      <Button title="Enter details manually" onPress={toForm} />
    </Screen>
  );
}
