import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Mint box with one short message: "Log in again to continue", "Email sent". */
export function Notice({ message }: { message: string }) {
  const theme = useTheme();

  return (
    <ThemedView type="primarySoft" style={[styles.box, { borderColor: theme.primary }]}>
      <ThemedText type="small" themeColor="primary">
        {message}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.three },
});
