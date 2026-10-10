import { type TextStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';

type TextLinkProps = {
  children: string;
  onPress: () => void;
  /** Set when the link stands on its own line: "Forgot Password?" sits at the right. */
  align?: TextStyle['textAlign'];
};

/** Green tappable text. Works inline inside another ThemedText or alone on a line. */
export function TextLink({ children, onPress, align }: TextLinkProps) {
  return (
    <ThemedText
      type="label"
      themeColor="primary"
      accessibilityRole="link"
      onPress={onPress}
      style={align ? { textAlign: align } : undefined}>
      {children}
    </ThemedText>
  );
}
