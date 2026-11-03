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
import { useEffect, useState } from 'react';
import { Appearance } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RecoveryScreen } from '@/components/app/RecoveryScreen';
import { useAppStore } from '@/store/appStore';
import { useCaseSimulation } from '@/store/useCaseSimulation';
import { useHydrated } from '@/store/useHydrated';
import { ThemeProvider, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync();

// Ein Fall-Link öffnet das Modal über den Tabs, nicht als erste Karte.
export const unstable_settings = { anchor: '(tabs)' };

function AppStatusBar() {
  const theme = useTheme();
  return <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />;
}

function RootStack() {
  const theme = useTheme();
  const onboardingDone = useAppStore((s) => s.onboardingDone);
  useCaseSimulation();
  return (
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
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SchibstedGrotesk_400Regular,
    SchibstedGrotesk_500Medium,
    SchibstedGrotesk_600SemiBold,
    SchibstedGrotesk_700Bold,
  });

  const status = useHydrated();
  // Nach einem Fehler bleibt der Hinweis stehen, während er neu lädt. So blinkt nichts.
  const [recovering, setRecovering] = useState(false);
  const recovery = status === 'fehler' || (recovering && status === 'laedt');
  const appearance = useAppStore((s) => s.appearance);
  const scheme = appearance === 'hell' ? 'light' : appearance === 'dunkel' ? 'dark' : undefined;

  // Auch Tastatur, Systemdialoge und Statusleiste folgen der Wahl im Profil
  useEffect(() => {
    Appearance.setColorScheme?.(scheme ?? 'unspecified');
  }, [scheme]);
  // Lässt sich der Speicher nicht laden, zeigt die App den Hinweis statt des Splash-Screens.
  const ready = (loaded || !!error) && (status !== 'laedt' || recovering);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  // Fehlt die Schrift, läuft die App mit der Systemschrift weiter.
  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <KeyboardProvider>
        <ThemeProvider scheme={scheme}>
          <AppStatusBar />
          {recovery ? <RecoveryScreen onBusyChange={setRecovering} /> : <RootStack />}
        </ThemeProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}
