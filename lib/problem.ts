// Gemeinsame Schritte beim Melden eines Problems, genutzt im Gespräch und in der Liste der Meldungen.
import { guides, type GuideId } from '@/data/guides';
import type { Id } from '@/model/types';
import { useAppStore } from '@/store/appStore';

/** Meldung im Display: Angabe des Haushalts speichern und die passende Anleitung starten. Öffnen tut der Aufrufer. */
export function reportDisplayMessage(caseId: Id, guideId: GuideId, code: string) {
  const s = useAppStore.getState();
  s.updateCase(caseId, { entry: 'meldung', problemLabel: code });
  s.addDiagnosis({
    caseId,
    photoIds: [],
    mode: 'meldung',
    errorPattern: guideId,
    displayMessage: code,
    confidence: 'hoch',
    confidenceScore: 1,
    source: 'nutzerangabe',
    guideId,
  });
  s.startGuide(caseId, guides[guideId].id);
}
