import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';

/** Listing and requesting need a verified account. ID verification is not built yet. */
export function VerifyNotice() {
  const { profile } = useAuth();
  if (profile?.verified) return null;

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold" themeColor="warning">
        Not verified yet
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Verify your ID to list or request items. ID verification is coming soon.
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, padding: Spacing.three, gap: Spacing.one },
});
