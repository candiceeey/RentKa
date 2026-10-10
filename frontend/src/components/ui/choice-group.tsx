import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ChoiceGroupProps<T extends string> = {
  label: string;
  required?: boolean;
  options: readonly { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
  error?: string;
};

/** Pick-one row of pills: "Sign up as", ID type. Wraps onto a second line when the options do not fit. */
export function ChoiceGroup<T extends string>({ label, required, options, value, onChange, error }: ChoiceGroupProps<T>) {
  const theme = useTheme();

  return (
    <View style={styles.wrap} accessibilityRole="radiogroup">
      <ThemedText type="label">
        {label}
        {required ? <ThemedText type="label" themeColor="danger">*</ThemedText> : null}
      </ThemedText>
      <View style={styles.options}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => onChange(option.value)}
              style={[
                styles.option,
                {
                  backgroundColor: selected ? theme.primary : theme.surface,
                  borderColor: selected ? theme.primary : error ? theme.danger : theme.border,
                },
              ]}>
              <ThemedText type="label" themeColor={selected ? 'onPrimary' : 'text'}>
                {option.label}
              </ThemedText>
            </Pressable>
          );
        })}
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
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  option: {
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
});
