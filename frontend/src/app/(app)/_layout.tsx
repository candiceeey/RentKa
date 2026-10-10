import { Stack, router } from 'expo-router';
import { useEffect } from 'react';

import { useAuth } from '@/context/auth';

export default function AppLayout() {
  const { shouldPromptVerify, clearVerifyPrompt } = useAuth();

  // Right after sign-up, open the ID step once. Leaving it does not block the app.
  useEffect(() => {
    if (!shouldPromptVerify) return;
    clearVerifyPrompt();
    router.push('/verify');
  }, [shouldPromptVerify, clearVerifyPrompt]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="verify" />
    </Stack>
  );
}
