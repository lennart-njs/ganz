import { router } from 'expo-router';

import type { ChatRecipient } from '@/lib/chat/recipient';

/** Verlässt den Fall-Stack und kehrt zu den Tabs zurück. */
export function leaveCase() {
  // Ausdrücklich die Tabs: „/“ passt auch auf (onboarding)/index.
  router.dismissTo('/(tabs)');
}

/**
 * Zurück ins Gespräch des Falls. Vollbild-Schritte (Kamera, Anleitung, Call) schließen sich dabei.
 * Ein Foto nimmt mit, für wen es aufgenommen wurde (`an`). Dort bleibt es bis zum Senden.
 */
export function backToThread(caseId: string, entwurf?: string, foto?: string, an?: ChatRecipient) {
  router.dismissTo({
    pathname: '/fall/[id]',
    params: {
      id: caseId,
      ...(entwurf ? { entwurf } : {}),
      ...(foto ? { foto, ...(an ? { an } : {}) } : {}),
    },
  });
}
