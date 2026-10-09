import { ThemedText } from '@/components/themed-text';
import { Screen } from '@/components/ui/screen';
import { useMode } from '@/context/mode';

export default function RentalsScreen() {
  const { mode } = useMode();

  return (
    <Screen inTabs>
      <ThemedText type="subtitle">Rentals</ThemedText>
      <ThemedText themeColor="textSecondary">
        {mode === 'lender'
          ? 'Items you have lent out will appear here.'
          : 'Items you are renting will appear here.'}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        No rentals yet.
      </ThemedText>
    </Screen>
  );
}
