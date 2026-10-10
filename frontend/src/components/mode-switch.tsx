import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useMode } from '@/context/mode';
import { type Role } from '@/core/stateMachine';
import { useTheme } from '@/hooks/use-theme';

export const ROLE_LABEL: Record<Role, string> = { lender: 'Lender', borrower: 'Borrower' };

/**
 * Lender / Borrower pill in the green app header. Shows only the roles the account holds:
 * with one role it is a plain label, with both it switches the side of the app being shown.
 */
export function ModeSwitch() {
  const { roles } = useAuth();
  const { mode, setMode } = useMode();
  const theme = useTheme();

  return (
    <View style={[styles.track, { backgroundColor: theme.onPrimarySoft }]}>
      {roles.map((role) => {
        const selected = roles.length > 1 && mode === role;
        return (
          <Pressable
            key={role}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            disabled={roles.length < 2}
            hitSlop={Spacing.two}
            onPress={() => setMode(role)}
            style={[styles.option, selected && { backgroundColor: theme.surface }]}>
            <ThemedText type="label" themeColor={selected ? 'primary' : 'onPrimary'}>
              {ROLE_LABEL[role]}
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
