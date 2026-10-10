import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useMode } from '@/context/mode';
import { type Role } from '@/core/stateMachine';
import { useTheme } from '@/hooks/use-theme';

const OPTIONS: { value: Role; label: string }[] = [
  { value: 'lender', label: 'Lender' },
  { value: 'borrower', label: 'Borrower' },
];

/** Lender / Borrower pill in the green app header. Same account either way. */
export function ModeSwitch() {
  const { mode, setMode } = useMode();
  const theme = useTheme();

  return (
    <View style={[styles.track, { backgroundColor: theme.onPrimarySoft }]}>
      {OPTIONS.map(({ value, label }) => {
        const selected = mode === value;
        return (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            hitSlop={Spacing.two}
            onPress={() => setMode(value)}
            style={[styles.option, selected && { backgroundColor: theme.surface }]}>
            <ThemedText type="label" themeColor={selected ? 'primary' : 'onPrimary'}>
              {label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    borderRadius: Radius.pill,
    padding: Spacing.half,
  },
  option: { borderRadius: Radius.pill, paddingHorizontal: Spacing.three, paddingVertical: Spacing.one },
});
