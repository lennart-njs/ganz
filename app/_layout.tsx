import {
  SchibstedGrotesk_400Regular,
  SchibstedGrotesk_500Medium,
  SchibstedGrotesk_600SemiBold,
  SchibstedGrotesk_700Bold,
  useFonts,
} from '@expo-google-fonts/schibsted-grotesk';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAppStore } from '@/store/appStore';
import { useCaseSimulation } from '@/store/useCaseSimulation';
import { useHydrated } from '@/store/useHydrated';
import { ThemeProvider, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync();

// Ein Fall-Link öffnet das Modal über den Tabs, nicht als erste Karte.
export const unstable_settings = { anchor: '(tabs)' };

function RootStack() {
  const theme = useTheme();
  const onboardingDone = useAppStore((s) => s.onboardingDone);
  useCaseSimulation();
  return (
    <>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.bgPage },
        }}
      >
        <Stack.Protected guard={!onboardingDone}>
          <Stack.Screen name="(onboarding)" />
        </Stack.Protected>
        <Stack.Protected guard={onboardingDone}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="geraet/[id]" />
          <Stack.Screen name="geraet/neu" />
          <Stack.Screen name="schutz-verknuepfen" />
          {/* Fall als modaler Stack (B-50). Kein Wegwischen nach unten: Schließen nur über X. */}
          <Stack.Screen
            name="fall"
            options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
          />
        </Stack.Protected>
        <Stack.Screen name="galerie" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SchibstedGrotesk_400Regular,
    SchibstedGrotesk_500Medium,
    SchibstedGrotesk_600SemiBold,
    SchibstedGrotesk_700Bold,
  });

  const hydrated = useHydrated();
  const ready = (loaded || !!error) && hydrated;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  // Fehlt die Schrift, läuft die App mit der Systemschrift weiter.
  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <RootStack />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
