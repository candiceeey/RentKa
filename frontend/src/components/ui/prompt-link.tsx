import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';

type PromptLinkProps = {
  /** Plain part: "Don't have an account?" */
  prompt: string;
  /** Green tappable part: "Sign Up" */
  action: string;
  onPress: () => void;
};

/** Centered one-line prompt with a green link, used under auth forms. */
export function PromptLink({ prompt, action, onPress }: PromptLinkProps) {
  return (
    <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
      {prompt}{' '}
      <ThemedText type="label" themeColor="primary" accessibilityRole="link" onPress={onPress}>
        {action}
      </ThemedText>
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
});
