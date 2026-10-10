import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { ROLE_LABEL } from '@/components/mode-switch';
import { ThemedText } from '@/components/themed-text';
import { BackButton } from '@/components/ui/back-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DetailRow } from '@/components/ui/detail-row';
import { FormError } from '@/components/ui/form-error';
import { FormTitle } from '@/components/ui/form-title';
import { Screen } from '@/components/ui/screen';
import { VerifyNotice } from '@/components/verify-notice';
import { authErrorMessage, useAuth } from '@/context/auth';
import { type Role } from '@/core/stateMachine';
import { VALID_ROLES } from '@/core/userProfile';
import { useRoleRating } from '@/hooks/use-role-rating';

/** Opened from the avatar in the header. */
export default function ProfileScreen() {
  const { user, profile, roles, addRole, signOut } = useAuth();
  const { mode, score, count } = useRoleRating();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const missing = VALID_ROLES.filter((role) => !roles.includes(role));

  const add = async (role: Role) => {
    setError('');
    setBusy(true);
    try {
      await addRole(role);
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const confirmAdd = (role: Role) =>
    Alert.alert(
      `Add the ${ROLE_LABEL[role]} role?`,
      'You keep your current role and your ID verification. A role cannot be removed later.',
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Add role', onPress: () => add(role) }],
    );

  return (
    <Screen>
      <BackButton onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      <FormTitle title="Profile" />

      <Card>
        <DetailRow label="Full Name" value={profile?.fullName ?? '-'} />
        <DetailRow label="Email" value={profile?.email ?? user?.email ?? '-'} />
        <DetailRow label="Mobile Number" value={profile?.contact ?? '-'} />
        <DetailRow label="Roles" value={roles.map((role) => ROLE_LABEL[role]).join(', ') || '-'} />
        <DetailRow
          label={`${ROLE_LABEL[mode]} Trust Score`}
          value={count > 0 ? `${score.toFixed(2)} (${count} ${count === 1 ? 'rating' : 'ratings'})` : 'No ratings yet'}
        />
        <DetailRow label="ID Verification" last>
          <Badge label={profile?.verified ? 'Verified' : 'Not verified'} tone={profile?.verified ? 'success' : 'warning'} />
        </DetailRow>
      </Card>

      <VerifyNotice />

      <ThemedText type="subheading">Settings</ThemedText>
      <Card>
        {missing.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            Your account has both roles. Switch between them from the header.
          </ThemedText>
        ) : (
          missing.map((role) => (
            <Button
              key={role}
              title={`Add ${ROLE_LABEL[role]} role`}
              variant="outline"
              onPress={() => confirmAdd(role)}
              loading={busy}
            />
          ))
        )}
        <FormError message={error} />
      </Card>

      <Button title="Sign out" variant="outline" onPress={signOut} />
    </Screen>
  );
}
