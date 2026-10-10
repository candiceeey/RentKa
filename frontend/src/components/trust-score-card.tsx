import { StyleSheet, View } from 'react-native';

import { ROLE_LABEL } from '@/components/mode-switch';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Radius, Spacing } from '@/constants/theme';
import { useRoleRating } from '@/hooks/use-role-rating';
import { useTheme } from '@/hooks/use-theme';

const RING = 64;

/** Trust score card at the top of Home, for the active role. Shows "New" until the first rating. */
export function TrustScoreCard() {
  const theme = useTheme();
  const { mode, score, count } = useRoleRating();
  const rated = count > 0;

  return (
    <Card style={styles.card}>
      <View style={[styles.ring, { borderColor: rated ? theme.primary : theme.border }]}>
        <ThemedText type={rated ? 'subheading' : 'label'} themeColor={rated ? 'primary' : 'textSecondary'}>
          {rated ? score.toFixed(1) : 'New'}
        </ThemedText>
        {rated ? (
          <ThemedText type="caption" themeColor="textSecondary">
            / 5
          </ThemedText>
        ) : null}
      </View>
      <View style={styles.text}>
        <ThemedText type="bodyBold">Your {ROLE_LABEL[mode]} Trust Score</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          {rated ? `Based on ${count} completed ${count === 1 ? 'rental' : 'rentals'}` : 'No ratings yet'}
        </ThemedText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  ring: {
    width: RING,
    height: RING,
    borderRadius: Radius.pill,
    borderWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: Spacing.half },
});
