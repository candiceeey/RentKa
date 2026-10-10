import { AppHeader } from '@/components/app-header';
import { ThemedText } from '@/components/themed-text';
import { TrustScoreCard } from '@/components/trust-score-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { VerifyNotice } from '@/components/verify-notice';
import { useMode } from '@/context/mode';

const CONTENT = {
  borrower: {
    title: 'Find an item',
    body: 'Post what you need and RentKa will match you with nearby lenders.',
    action: 'Post a request',
  },
  lender: {
    title: 'My items',
    body: 'List an item and RentKa will match it with borrowers who need it.',
    action: 'List an item',
  },
} as const;

export default function HomeScreen() {
  const { mode } = useMode();
  const content = CONTENT[mode];

  return (
    <Screen inTabs header={<AppHeader />}>
      <TrustScoreCard />
      <VerifyNotice />

      <Card>
        <ThemedText type="subheading">{content.title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {content.body}
        </ThemedText>
        {/* Listing and request flows are a later build step. */}
        <Button title={`${content.action} (coming soon)`} disabled />
      </Card>
    </Screen>
  );
}
