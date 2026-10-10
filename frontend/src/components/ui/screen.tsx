import { StatusBar } from 'expo-status-bar';
import { type ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Radius, Spacing } from '@/constants/theme';

type ScreenProps = {
  children: ReactNode;
  /** Set on screens inside the tab bar so content is not hidden behind it. */
  inTabs?: boolean;
  /** Fixed bar above the scrolling content, for example AppHeader. It handles the status-bar inset itself. */
  header?: ReactNode;
  /** Login-style layout: this content sits on a green top area and the page becomes a rounded cream sheet. */
  hero?: ReactNode;
};

/** Page wrapper: cream background, safe-area padding, scrolls when the keyboard is open. */
export function Screen({ children, inTabs = false, header, hero }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const top = header || hero ? Spacing.four : insets.top + Spacing.four;
  const bottom = insets.bottom + Spacing.four + (inTabs ? BottomTabInset : 0);
  const content = [styles.content, { paddingTop: top, paddingBottom: bottom }];

  return (
    <ThemedView type={hero ? 'brand' : 'background'} style={styles.fill}>
      <StatusBar style={header || hero ? 'light' : 'dark'} />
      {header}
      <KeyboardAvoidingView style={styles.fill} behavior="padding">
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={hero ? styles.grow : content}>
          {hero ? (
            <>
              <View style={[styles.hero, { paddingTop: insets.top + Spacing.six }]}>{hero}</View>
              <ThemedView style={[styles.sheet, content]}>{children}</ThemedView>
            </>
          ) : (
            children
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  grow: { flexGrow: 1 },
  content: { flexGrow: 1, paddingHorizontal: Spacing.four, gap: Spacing.three },
  hero: { alignItems: 'center', paddingBottom: Spacing.five },
  sheet: { borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl },
});
