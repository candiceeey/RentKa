import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { Type } from '@/constants/theme';
import { useMode } from '@/context/mode';
import { useTheme } from '@/hooks/use-theme';

/** Lender: Home, Listings, Requests, Messages. Borrower: Home, Requests, Messages. */
export default function TabsLayout() {
  const theme = useTheme();
  const { mode } = useMode();

  return (
    <NativeTabs
      backgroundColor={theme.surface}
      indicatorColor={theme.primarySoft}
      iconColor={{ default: theme.textSecondary, selected: theme.primary }}
      labelStyle={{
        default: { color: theme.textSecondary, fontFamily: Type.caption.fontFamily },
        selected: { color: theme.primary, fontFamily: Type.label.fontFamily },
      }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house" md="home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="listings" hidden={mode !== 'lender'}>
        <NativeTabs.Trigger.Label>Listings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="shippingbox" md="inventory_2" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="requests">
        <NativeTabs.Trigger.Label>Requests</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="doc.text" md="description" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="messages">
        <NativeTabs.Trigger.Label>Messages</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="message" md="chat_bubble" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
