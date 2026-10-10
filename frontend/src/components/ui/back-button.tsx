import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Spacing } from '@/constants/theme';

/** Green back arrow at the top-left of a form screen. */
export function BackButton({ onPress = () => router.back() }: { onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      hitSlop={Spacing.three}
      onPress={onPress}
      style={styles.button}>
      <Icon name="arrow_back" size={28} themeColor="primary" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignSelf: 'flex-start' },
});
