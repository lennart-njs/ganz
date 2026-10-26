import { router } from 'expo-router';

/** Verlässt den Fall-Stack und kehrt zu den Tabs zurück. */
export function leaveCase() {
  router.dismissTo('/');
}
