import { router } from 'expo-router';

/** Verlässt den Fall-Stack und kehrt zu den Tabs zurück. */
export function leaveCase() {
  // Ausdrücklich die Tabs: „/“ passt auch auf (onboarding)/index.
  router.dismissTo('/(tabs)');
}

/** Zurück ins Gespräch des Falls. Vollbild-Schritte (Kamera, Anleitung, Call) schließen sich dabei. */
export function backToThread(caseId: string, entwurf?: string) {
  router.dismissTo({
    pathname: '/fall/[id]',
    params: entwurf ? { id: caseId, entwurf } : { id: caseId },
  });
}
