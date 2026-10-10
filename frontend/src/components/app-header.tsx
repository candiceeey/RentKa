import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ModeSwitch } from '@/components/mode-switch';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useMode } from '@/context/mode';

const AVATAR = 40;

/** Green header on the signed-in tabs: greeting, Lender/Borrower switch, avatar. Darker green in lender view. */
export function AppHeader() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const { mode } = useMode();
  const firstName = profile?.fullName?.trim().split(/\s+/)[0];

  return (
    <ThemedView
      type={mode === 'lender' ? 'headerLender' : 'headerBorrower'}
      style={[styles.header, { paddingTop: insets.top + Spacing.three }]}>
      <View style={styles.left}>
        <ThemedText type="heading" themeColor="onPrimary" numberOfLines={1}>
          {firstName ? `Hello, ${firstName} 👋` : 'Hello 👋'}
        </ThemedText>
        <ModeSwitch />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Profile"
        hitSlop={Spacing.two}
        onPress={() => router.navigate('/profile')}>
        <ThemedView type="surface" style={styles.avatar}>
          <ThemedText type="bodyBold" themeColor="primary">
            {firstName?.[0]?.toUpperCase() ?? '?'}
          </ThemedText>
        </ThemedView>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
    borderBottomLeftRadius: Radius.xl,
    borderBottomRightRadius: Radius.xl,
  },
  left: { flex: 1, gap: Spacing.two },
  avatar: { width: AVATAR, height: AVATAR, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
});
