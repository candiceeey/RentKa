import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { VerifyNotice } from '@/components/verify-notice';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useMode } from '@/context/mode';

const CONTENT = {
  borrower: {
    title: 'Find an item',
    body: 'Post what you need and RentKa will match you with nearby lenders.',
    action: 'Post a request',
  },
  lender: {
    title: 'My items',
    body: 'List an item and RentKa will match it with borrowers who need it.',
    action: 'List an item',
  },
} as const;

export default function HomeScreen() {
  const { profile } = useAuth();
  const { mode } = useMode();
  const content = CONTENT[mode];
  const firstName = profile?.fullName?.trim().split(/\s+/)[0];

  return (
    <Screen inTabs>
      <ThemedText type="subtitle">{firstName ? `Hi, ${firstName}` : 'Hi'}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {mode === 'lender' ? 'Lender view' : 'Borrower view'} · change it in Profile
      </ThemedText>

      <VerifyNotice />

      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold" style={styles.cardTitle}>
          {content.title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {content.body}
        </ThemedText>
        {/* Listing and request flows are a later build step. */}
        <Button title={`${content.action} (coming soon)`} disabled />
      </ThemedView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, padding: Spacing.three, gap: Spacing.two },
  cardTitle: { fontSize: 18 },
});
