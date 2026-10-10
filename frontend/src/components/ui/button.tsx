import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ControlHeight, Radius, Shadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  title: string;
  /** primary: filled green. outline: white with a green border. */
  variant?: 'primary' | 'outline';
  loading?: boolean;
};

export function Button({ title, variant = 'primary', loading = false, disabled, ...rest }: ButtonProps) {
  const theme = useTheme();
  const primary = variant === 'primary';
  const off = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={off}
      style={({ pressed }) => [
        styles.base,
        primary
          ? { backgroundColor: theme.primary }
          : { backgroundColor: theme.surface, borderWidth: 1.5, borderColor: theme.primary },
        primary && !off && Shadow.button,
        (pressed || off) && styles.dimmed,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={primary ? theme.onPrimary : theme.primary} />
      ) : (
        <ThemedText type="bodyBold" themeColor={primary ? 'onPrimary' : 'primary'}>
          {title}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: ControlHeight,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimmed: { opacity: 0.6 },
});
