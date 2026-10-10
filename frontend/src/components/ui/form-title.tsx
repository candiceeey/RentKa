import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing, type TextType } from '@/constants/theme';

type FormTitleProps = {
  title: string;
  subtitle?: string;
  /** title: the large login headline. heading: the smaller form headline. */
  size?: Extract<TextType, 'title' | 'heading'>;
};

/** Centered green headline (with optional grey line under it) at the top of auth and form screens. */
export function FormTitle({ title, subtitle, size = 'heading' }: FormTitleProps) {
  return (
    <View style={styles.wrap}>
      <ThemedText type={size} themeColor="primary" style={styles.center}>
        {title}
      </ThemedText>
      {subtitle ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          {subtitle}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.one, marginBottom: Spacing.two },
  center: { textAlign: 'center' },
});
