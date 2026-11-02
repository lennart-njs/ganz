import { Stack } from 'expo-router';

import { useReduceMotion } from '@/components/ds';
import { useTheme } from '@/theme';

/** Modaler Fall-Stack. Wischgeste und Android-Zurück gehen einen Screen zurück, wie der Zurück-Button. */
export default function FallLayout() {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
        contentStyle: { backgroundColor: theme.colors.bgPage },
        animation: reduceMotion ? 'none' : 'default',
      }}
    />
  );
}
