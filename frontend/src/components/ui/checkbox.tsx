import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const BOX = 22;

type CheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Text beside the box. May contain a TextLink. */
  children: ReactNode;
  error?: string;
};

export function Checkbox({ checked, onChange, children, error }: CheckboxProps) {
  const theme = useTheme();

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked }}
          hitSlop={Spacing.two}
          onPress={() => onChange(!checked)}
          style={[
            styles.box,
            {
              backgroundColor: checked ? theme.primary : theme.surface,
              borderColor: checked ? theme.primary : error ? theme.danger : theme.border,
            },
          ]}>
          {checked ? <Icon name="check" size={16} themeColor="onPrimary" /> : null}
        </Pressable>
        <ThemedText type="small" style={styles.text}>
          {children}
        </ThemedText>
      </View>
      {error ? (
        <ThemedText type="caption" themeColor="danger">
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.one },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  box: { width: BOX, height: BOX, borderWidth: 1, borderRadius: Radius.sm / 2, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1 },
});
