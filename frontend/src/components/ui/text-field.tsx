import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { ControlHeight, Radius, Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type TextFieldProps = Omit<TextInputProps, 'style'> & {
  /** Shown above the input. Leave out for placeholder-only fields (login). */
  label?: string;
  /** Adds the red asterisk after the label. */
  required?: boolean;
  error?: string;
  /** surface: white, for fields on the cream page. muted: light grey, for labeled forms. */
  tone?: 'surface' | 'muted';
};

export function TextField({ label, required, error, tone = 'muted', secureTextEntry, ...rest }: TextFieldProps) {
  const theme = useTheme();
  const [hidden, setHidden] = useState(true);

  return (
    <View style={styles.wrap}>
      {label ? (
        <ThemedText type="label">
          {label}
          {required ? <ThemedText type="label" themeColor="danger">*</ThemedText> : null}
        </ThemedText>
      ) : null}
      <View
        style={[
          styles.box,
          {
            backgroundColor: tone === 'surface' ? theme.surface : theme.surfaceMuted,
            borderColor: error ? theme.danger : theme.border,
          },
        ]}>
        <TextInput
          accessibilityLabel={label ?? rest.placeholder}
          placeholderTextColor={theme.placeholder}
          secureTextEntry={secureTextEntry && hidden}
          style={[styles.input, { color: theme.text }]}
          {...rest}
        />
        {secureTextEntry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            hitSlop={Spacing.two}
            onPress={() => setHidden((h) => !h)}>
            <Icon name={hidden ? 'visibility' : 'visibility_off'} size={22} themeColor="placeholder" />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <ThemedText type="caption" themeColor="danger">
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two },
  box: {
    minHeight: ControlHeight,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  input: { flex: 1, paddingVertical: Spacing.two, ...Type.body, lineHeight: undefined },
});
