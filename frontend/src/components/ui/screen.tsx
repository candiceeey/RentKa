import { type ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';

type ScreenProps = {
  children: ReactNode;
  /** Set on screens inside the tab bar so content is not hidden behind it. */
  inTabs?: boolean;
};

/** Page wrapper: themed background, safe-area padding, scrolls when the keyboard is open. */
export function Screen({ children, inTabs = false }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const bottom = insets.bottom + Spacing.four + (inTabs ? BottomTabInset : 0);

  return (
    <ThemedView style={styles.fill}>
      <KeyboardAvoidingView style={styles.fill} behavior="padding">
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + Spacing.four, paddingBottom: bottom },
          ]}>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: Spacing.four, gap: Spacing.three },
});
