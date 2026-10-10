import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { AuthProvider, useAuth } from '@/context/auth';
import { ModeProvider } from '@/context/mode';
import { useTheme } from '@/hooks/use-theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <AuthProvider>
      <ModeProvider>
        <RootNavigator />
      </ModeProvider>
    </AuthProvider>
  );
}

function RootNavigator() {
  const { stage } = useAuth();
  const theme = useTheme();
  // Names must match Fonts in constants/theme.ts. On a load error the app falls back to the system font.
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  const fontsReady = fontsLoaded || !!fontError;
  const navTheme = {
    ...DefaultTheme,
    colors: { ...DefaultTheme.colors, primary: theme.primary, background: theme.background, text: theme.text },
  };

  // Keep the splash screen up until fonts are in and we know whether someone is signed in.
  useEffect(() => {
    if (fontsReady && stage !== 'loading') SplashScreen.hideAsync();
  }, [fontsReady, stage]);

  if (!fontsReady) return null;

  if (stage === 'loading') {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator size="large" color={theme.primary} />
      </ThemedView>
    );
  }

  return (
    <ThemeProvider value={navTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={stage === 'ready'}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Protected guard={stage === 'needsProfile'}>
          <Stack.Screen name="complete-profile" />
        </Stack.Protected>
        <Stack.Protected guard={stage === 'signedOut'}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
