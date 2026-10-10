import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing, type ThemeColor } from '@/constants/theme';

type Tone = 'success' | 'warning' | 'info';

const TONES: Record<Tone, { background: ThemeColor; text: ThemeColor }> = {
  success: { background: 'primarySoft', text: 'primary' },
  warning: { background: 'warningSoft', text: 'warning' },
  info: { background: 'infoSoft', text: 'info' },
};

/** Small status chip: "Verified", "Available", "Awaiting Payment". */
export function Badge({ label, tone = 'success' }: { label: string; tone?: Tone }) {
  const { background, text } = TONES[tone];

  return (
    <ThemedView type={background} style={styles.badge}>
      <ThemedText type="label" themeColor={text}>
        {label}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
});
