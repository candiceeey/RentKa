import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type DetailRowProps = {
  label: string;
  /** Plain text value, or pass children for a custom value such as a Badge. */
  value?: string;
  children?: ReactNode;
  /** Set on the last row of a card to drop the divider line. */
  last?: boolean;
};

/** Small grey label over its value, with a divider. Used in profile and review cards. */
export function DetailRow({ label, value, children, last = false }: DetailRowProps) {
  const theme = useTheme();

  return (
    <View style={[styles.row, !last && { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
      <ThemedText type="caption" themeColor="textSecondary">
        {label}
      </ThemedText>
      {children ?? <ThemedText>{value}</ThemedText>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: Spacing.one, paddingVertical: Spacing.two },
});
