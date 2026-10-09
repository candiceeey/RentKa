import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useMode } from '@/context/mode';
import { type Role } from '@/core/stateMachine';
import { useTheme } from '@/hooks/use-theme';

const OPTIONS: { value: Role; label: string }[] = [
  { value: 'borrower', label: 'Borrower' },
  { value: 'lender', label: 'Lender' },
];

/** Switches which side of the app is shown. Same account either way. */
export function ModeSwitch() {
  const { mode, setMode } = useMode();
  const theme = useTheme();

  return (
    <ThemedView type="backgroundElement" style={styles.track}>
      {OPTIONS.map(({ value, label }) => {
        const selected = mode === value;
        return (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => setMode(value)}
            style={[styles.option, selected && { backgroundColor: theme.primary }]}>
            <ThemedText type="smallBold" style={{ color: selected ? theme.onPrimary : theme.text }}>
              {label}
            </ThemedText>
          </Pressable>
        );
      })}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', borderRadius: 12, padding: Spacing.one, gap: Spacing.one },
  option: { flex: 1, minHeight: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
