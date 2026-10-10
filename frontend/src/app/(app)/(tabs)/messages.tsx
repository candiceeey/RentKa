import { AppHeader } from '@/components/app-header';
import { ROLE_LABEL } from '@/components/mode-switch';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { useMode } from '@/context/mode';
import { useInbox } from '@/hooks/use-inbox';

/** Inbox for the active role. Opening a chat comes with the rental screens. */
export default function MessagesScreen() {
  const { mode } = useMode();
  const { chats, loading } = useInbox();

  return (
    <Screen inTabs header={<AppHeader />}>
      <ThemedText type="heading">Messages</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Showing messages as:{' '}
        <ThemedText type="label" themeColor="primary">
          {ROLE_LABEL[mode]}
        </ThemedText>
      </ThemedText>

      {chats.map((chat) => (
        <Card key={chat.rentalId}>
          <ThemedText type="bodyBold">Rental {chat.rentalId}</ThemedText>
          {chat.status ? <Badge label={chat.status} tone="info" /> : null}
        </Card>
      ))}

      {!loading && chats.length === 0 ? (
        <Card>
          <ThemedText type="small" themeColor="textSecondary">
            {mode === 'lender'
              ? 'No conversations yet. Chats with borrowers of your items will appear here.'
              : 'No conversations yet. Chats with lenders will appear here.'}
          </ThemedText>
        </Card>
      ) : null}
    </Screen>
  );
}
