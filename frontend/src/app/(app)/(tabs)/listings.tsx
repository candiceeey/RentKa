import { AppHeader } from '@/components/app-header';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { VerifyNotice } from '@/components/verify-notice';

/** Lender-only tab. The listing flow (photo first, editable auto-fill) is a later build step. */
export default function ListingsScreen() {
  return (
    <Screen inTabs header={<AppHeader />}>
      <ThemedText type="heading">My Listings</ThemedText>
      <VerifyNotice />
      <Card>
        <ThemedText type="small" themeColor="textSecondary">
          No listings yet. Items you list for rent will appear here.
        </ThemedText>
      </Card>
    </Screen>
  );
}
