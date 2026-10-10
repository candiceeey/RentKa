import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Icon } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';

const CIRCLE = 112;

type ResultPanelProps = {
  tone: 'success' | 'danger';
  title: string;
  message: string;
};

/** Centered icon in a soft circle with a headline and one line of explanation: the end of a flow. */
export function ResultPanel({ tone, title, message }: ResultPanelProps) {
  const success = tone === 'success';

  return (
    <View style={styles.wrap}>
      <ThemedView type={success ? 'primarySoft' : 'dangerSoft'} style={styles.circle}>
        <Icon name={success ? 'check_circle' : 'cancel'} size={56} themeColor={success ? 'primary' : 'danger'} />
      </ThemedView>
      <ThemedText type="heading" style={styles.center}>
        {title}
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.center}>
        {message}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.five },
  circle: { width: CIRCLE, height: CIRCLE, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center' },
});
