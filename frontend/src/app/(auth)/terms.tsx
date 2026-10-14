import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BackButton } from '@/components/ui/back-button';
import { Card } from '@/components/ui/card';
import { FormTitle } from '@/components/ui/form-title';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import {
  TERMS_CONTACT, TERMS_INTRO, TERMS_LAST_UPDATED, TERMS_SECTIONS, TERMS_TITLE,
} from '@/constants/terms';

/** Read-only Terms and Conditions. The text lives in constants/terms.ts. */
export default function TermsScreen() {
  return (
    <Screen>
      <BackButton />
      <FormTitle title={TERMS_TITLE} subtitle={`Last updated: ${TERMS_LAST_UPDATED}`} />
      <ThemedText type="small">{TERMS_INTRO}</ThemedText>

      {TERMS_SECTIONS.map((section) => (
        <Card key={section.title}>
          <ThemedText type="bodyBold">{section.title}</ThemedText>
          {section.paragraphs?.map((text) => (
            <ThemedText key={text} type="small" themeColor="textSecondary">
              {text}
            </ThemedText>
          ))}
          {section.bullets?.map((text) => (
            <View key={text} style={styles.bullet}>
              <ThemedText type="small" themeColor="textSecondary">
                {'•'}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.bulletText}>
                {text}
              </ThemedText>
            </View>
          ))}
        </Card>
      ))}

      <ThemedText type="small" themeColor="textSecondary">
        Contact:{' '}
        <ThemedText type="label" themeColor="primary">
          {TERMS_CONTACT}
        </ThemedText>
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bullet: { flexDirection: 'row', gap: Spacing.two },
  bulletText: { flex: 1 },
});
