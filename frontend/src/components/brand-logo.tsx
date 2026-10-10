import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Placeholder for the RentKa mark (boxed monogram over the spaced wordmark).
 * Swap the monogram for the real logo image once the asset file is added to assets/images.
 */
export function BrandLogo({ themeColor = 'onPrimary' }: { themeColor?: ThemeColor }) {
  const theme = useTheme();

  return (
    <View style={styles.wrap} accessibilityRole="image" accessibilityLabel="RentKa">
      <View style={[styles.box, { borderColor: theme[themeColor] }]}>
        <ThemedText type="heading" themeColor={themeColor}>
          RK
        </ThemedText>
      </View>
      <ThemedText type="caption" themeColor={themeColor} style={styles.wordmark}>
        RentKa
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: Spacing.one },
  box: { width: 72, height: 72, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  wordmark: { letterSpacing: 4 },
});
