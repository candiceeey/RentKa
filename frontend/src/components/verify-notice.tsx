import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/hooks/use-theme';

/** Shown until the account is verified. Posting and renting are blocked by the rules until then. */
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
        Verify your ID to list items, post requests and rent.
      </ThemedText>
      <Button title="Verify now" onPress={() => router.push('/verify')} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.three, gap: Spacing.two },
});
