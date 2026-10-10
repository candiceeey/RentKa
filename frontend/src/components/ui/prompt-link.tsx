import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { TextLink } from '@/components/ui/text-link';

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
      {prompt} <TextLink onPress={onPress}>{action}</TextLink>
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
});
