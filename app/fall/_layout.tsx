import { Stack } from 'expo-router';

import { useTheme } from '@/theme';

/** Modaler Fall-Stack. Wischgeste und Android-Zurück gehen einen Screen zurück, wie der Zurück-Button. */
export default function FallLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
        contentStyle: { backgroundColor: theme.colors.bgPage },
      }}
    />
  );
}
