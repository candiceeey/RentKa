import { AppHeader } from '@/components/app-header';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { useMode } from '@/context/mode';

export default function RequestsScreen() {
  const { mode } = useMode();

  return (
    <Screen inTabs header={<AppHeader />}>
      <ThemedText type="heading">{mode === 'lender' ? 'Rental Requests' : 'My Requests'}</ThemedText>
      <Card>
        <ThemedText type="small" themeColor="textSecondary">
          {mode === 'lender'
            ? 'No rental requests yet. Requests for your items will appear here.'
            : 'No requests yet. Your posts and rented items will appear here.'}
        </ThemedText>
      </Card>
    </Screen>
  );
}
