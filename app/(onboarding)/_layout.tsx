import { Stack } from 'expo-router';

import { useTheme } from '@/theme';

export default function OnboardingLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.bgPage } }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="willkommen" />
      <Stack.Screen name="schutz" />
      <Stack.Screen name="geraet-bestaetigen" />
      <Stack.Screen name="typenschild" />
    </Stack>
  );
}
