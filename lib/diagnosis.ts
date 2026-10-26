import { de } from '@/i18n/de';
import type { Diagnosis } from '@/model/types';
import type { DiagnosisFinding, PhotoMode } from '@/services';

/** Ergebnis des Mocks als Diagnosis für Fall, Fallakte und Dashboards */
export function toDiagnosis(
  caseId: string,
  photoIds: string[],
  mode: PhotoMode,
  finding: DiagnosisFinding,
): Omit<Diagnosis, 'id' | 'createdAt'> {
  return {
    caseId,
    photoIds,
    mode,
    errorPattern: finding.errorPattern,
    displayMessage: finding.displayMessage,
    component: de.result.component[finding.errorPattern],
    visibleDamage: de.result.noDamage,
    confidence: finding.confidence,
    confidenceScore: finding.confidenceScore,
    source: 'fehlererkennung',
    guideId: finding.guideId,
  };
}

export function isPhotoMode(v: string | undefined): v is PhotoMode {
  return v === 'display' || v === 'typenschild' || v === 'bauteil';
}
