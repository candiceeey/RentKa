import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function AppLayout() {
  const theme = useTheme();

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

      <NativeTabs.Trigger name="requests">
        <NativeTabs.Trigger.Label>Requests</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="doc.text" md="description" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person" md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
