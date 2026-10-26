import { router } from 'expo-router';

/** Verlässt den Fall-Stack und kehrt zu den Tabs zurück. */
export function leaveCase() {
  // Ausdrücklich die Tabs: „/“ passt auch auf (onboarding)/index.
  router.dismissTo('/(tabs)');
}
