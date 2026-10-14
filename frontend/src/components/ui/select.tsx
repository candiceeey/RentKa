import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Icon } from '@/components/ui/icon';
import { ControlHeight, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type SelectProps<T extends string> = {
  label: string;
  required?: boolean;
  placeholder?: string;
  options: readonly { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
  error?: string;
  /** surface: white, for the cream page. muted: light grey, for labeled forms. Same as TextField. */
  tone?: 'surface' | 'muted';
};

/** Dropdown: looks like a TextField, opens a list from the bottom of the screen. No native package needed. */
export function Select<T extends string>({
  label, required, placeholder = 'Select', options, value, onChange, error, tone = 'muted',
}: SelectProps<T>) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  const pick = (next: T) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <View style={styles.wrap}>
      <ThemedText type="label">
        {label}
        {required ? <ThemedText type="label" themeColor="danger">*</ThemedText> : null}
      </ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? placeholder}`}
        onPress={() => setOpen(true)}
        style={[
          styles.box,
          {
            backgroundColor: tone === 'surface' ? theme.surface : theme.surfaceMuted,
            borderColor: error ? theme.danger : theme.border,
          },
        ]}>
        <ThemedText themeColor={selected ? 'text' : 'placeholder'} style={styles.value}>
          {selected?.label ?? placeholder}
        </ThemedText>
        <Icon name="expand_more" size={24} themeColor="placeholder" />
      </Pressable>
      {error ? (
        <ThemedText type="caption" themeColor="danger">
          {error}
        </ThemedText>
      ) : null}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={[styles.backdrop, { backgroundColor: theme.overlay }]} onPress={() => setOpen(false)}>
          <ThemedView type="surface" style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.three }]}>
            <ThemedText type="subheading" style={styles.sheetTitle}>
              {label}
            </ThemedText>
            <ScrollView>
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => pick(option.value)}
                    style={[styles.option, { borderBottomColor: theme.border }, isSelected && { backgroundColor: theme.primarySoft }]}>
                    <ThemedText type={isSelected ? 'bodyBold' : 'body'} themeColor={isSelected ? 'primary' : 'text'} style={styles.value}>
                      {option.label}
                    </ThemedText>
                    {isSelected ? <Icon name="check" size={22} themeColor="primary" /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </ThemedView>
        </Pressable>
      </Modal>
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
  value: { flex: 1 },
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, paddingTop: Spacing.four, maxHeight: '70%' },
  sheetTitle: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.two },
  option: {
    minHeight: ControlHeight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    borderBottomWidth: 1,
    gap: Spacing.two,
  },
});
