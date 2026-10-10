import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/hooks/use-theme';

/** Listing and requesting need a verified account. ID verification is not built yet. */
export function VerifyNotice() {
  const theme = useTheme();
  const { profile } = useAuth();
  if (profile?.verified) return null;

  return (
    <ThemedView type="warningSoft" style={[styles.box, { borderColor: theme.warningBorder }]}>
      <ThemedText type="label" themeColor="warning">
        Not verified yet
      </ThemedText>
      <ThemedText type="small" themeColor="warning">
        Verify your ID to list or request items. ID verification is coming soon.
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.three, gap: Spacing.one },
});
