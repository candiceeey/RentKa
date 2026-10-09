import { StyleSheet, View } from 'react-native';

import { ModeSwitch } from '@/components/mode-switch';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { VerifyNotice } from '@/components/verify-notice';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText>{value}</ThemedText>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, profile, signOut } = useAuth();
  const ratings = profile?.ratingCount ?? 0;

  return (
    <Screen inTabs>
      <ThemedText type="subtitle">Profile</ThemedText>

      <ThemedView type="backgroundElement" style={styles.card}>
        <Row label="Name" value={profile?.fullName ?? '-'} />
        <Row label="Email" value={profile?.email ?? user?.email ?? '-'} />
        <Row label="Mobile number" value={profile?.contact ?? '-'} />
        <Row
          label="Trust score"
          value={ratings > 0 && profile?.trustScore != null ? `${profile.trustScore.toFixed(2)} (${ratings})` : 'No ratings yet'}
        />
        <Row label="ID verification" value={profile?.verified ? 'Verified' : 'Not verified'} />
      </ThemedView>

      <VerifyNotice />

      <ThemedText type="smallBold">Use RentKa as</ThemedText>
      <ModeSwitch />

      <Button title="Sign out" variant="secondary" onPress={signOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, padding: Spacing.three, gap: Spacing.three },
  row: { gap: Spacing.half },
});
