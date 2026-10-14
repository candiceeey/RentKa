import { router } from 'expo-router';
import { useState } from 'react';

import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChoiceGroup } from '@/components/ui/choice-group';
import { DetailRow } from '@/components/ui/detail-row';
import { FormError } from '@/components/ui/form-error';
import { FormTitle } from '@/components/ui/form-title';
import { ResultPanel } from '@/components/ui/result-panel';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { authErrorMessage, useAuth } from '@/context/auth';
import {
  ID_TYPES, normalizeBirthdate, normalizeIdNumber, validateIdForm, type IdForm, type VerificationResult,
} from '@/core/identity';

type Step = 'form' | 'check' | 'result';

/**
 * ID step: form -> check details -> instant result. The fields live only in this screen's memory and never
 * leave the phone: verifyIdentity gets only a hash of the ID type and number and pass/fail results
 * (buildVerificationRequest in the core). The ML Kit scan will pre-fill
 * the same form later, and the liveness check will sit between "check" and "result".
 */
export default function VerifyScreen() {
  const { profile, verifyIdentity } = useAuth();
  const [step, setStep] = useState<Step>('form');
  const [form, setForm] = useState<IdForm>({
    fullName: profile?.fullName ?? '', birthdate: '', idType: null, idNumber: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof IdForm, string>>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);

  const set = (key: 'fullName' | 'birthdate' | 'idNumber') => (value: string) => setForm((f) => ({ ...f, [key]: value }));
  const idType = ID_TYPES.find((t) => t.value === form.idType);
  const leave = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const toCheck = () => {
    const found = validateIdForm(form);
    setErrors(found);
    if (Object.keys(found).length === 0) setStep('check');
  };

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      setResult(await verifyIdentity(form));
      setStep('result');
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

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
        {verified ? (
          <Button title="Continue" onPress={leave} />
        ) : (
          <>
            {locked ? null : <Button title="Try again" onPress={() => setStep('form')} />}
            <Button title="Not now" variant="outline" onPress={leave} />
          </>
        )}
      </Screen>
    );
  }

  if (step === 'check') {
    return (
      <Screen>
        <BackButton onPress={() => setStep('form')} />
        <FormTitle title="Check Your Details" subtitle="Make sure these match your ID exactly." />
        <Card>
          <DetailRow label="Full Name" value={form.fullName.trim()} />
          <DetailRow label="Birthdate" value={normalizeBirthdate(form.birthdate) ?? form.birthdate} />
          <DetailRow label="ID Type" value={idType?.label ?? '-'} />
          <DetailRow label="ID Number" value={normalizeIdNumber(form.idNumber)} last />
        </Card>
        <FormError message={error} />
        <Button title="Confirm and verify" onPress={submit} loading={busy} />
        <Button title="Edit details" variant="outline" onPress={() => setStep('form')} disabled={busy} />
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
        label="Birthdate"
        required
        placeholder="YYYY-MM-DD"
        value={form.birthdate}
        onChangeText={set('birthdate')}
        keyboardType="numbers-and-punctuation"
        error={errors.birthdate}
      />
      <ChoiceGroup
        label="ID Type"
        required
        options={ID_TYPES}
        value={form.idType}
        onChange={(value) => setForm((f) => ({ ...f, idType: value }))}
        error={errors.idType}
      />
      <TextField
        tone="surface"
        label="ID Number"
        required
        placeholder={idType?.example ?? 'Choose the ID type first'}
        value={form.idNumber}
        onChangeText={set('idNumber')}
        autoCapitalize="characters"
        autoCorrect={false}
        error={errors.idNumber}
      />
      <Button title="Next" onPress={toCheck} />
    </Screen>
  );
}
