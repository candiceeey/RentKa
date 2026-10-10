import { StyleSheet, type ViewProps } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { Radius, Shadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** White rounded panel used for every grouped block of content. */
export function Card({ style, ...rest }: ViewProps) {
  const theme = useTheme();

  return <ThemedView type="surface" style={[styles.card, { borderColor: theme.border }, style]} {...rest} />;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
    ...Shadow.card,
  },
});
