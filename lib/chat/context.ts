// Was der Reparatur-Assistent über den Fall erfährt. Bewusst ohne Adresse, Fotos und Vertragsnummer.
import { getGuide } from '@/lib/guideCatalog';
import type { GuideId } from '@/data/guides';
import { de } from '@/i18n/de';
import { latestDiagnosis, latestGuideRun } from '@/lib/caseView';
import { getManufacturer } from '@/lib/devices';
import type { Id } from '@/model/types';
import type { AppData } from '@/store/appStore';

import type { ChatContext } from './prompt';

export function chatContext(s: AppData, caseId: Id): ChatContext | undefined {
  const c = s.cases[caseId];
  const device = s.devices.find((d) => d.id === c?.deviceId);
  if (!c || !device) return undefined;
  const result = latestDiagnosis(s, c, 'fehlererkennung') ?? latestDiagnosis(s, c, 'nutzerangabe');
  const run = latestGuideRun(s, c);
  const guide = run ? getGuide(run.guideId) : undefined;
  return {
    category: device.category,
    categoryLabel: de.deviceCategory[device.category],
    device: device.model,
    manufacturer: getManufacturer(device.manufacturerId).name,
    manufacturerId: device.manufacturerId,
    ...(device.materialNumber ? { materialNumber: device.materialNumber } : {}),
    problem: c.problemLabel,
    result: result?.component,
    displayMessage: result?.displayMessage,
    guide:
      run && guide
        ? {
            id: guide.id,
            title: guide.title,
            step: run.currentStep + 1,
            total: guide.steps.length,
            ended: run.outcome ? de.file.event.outcome[run.outcome] : undefined,
            current: guide.steps[Math.min(run.currentStep, guide.steps.length - 1)],
          }
        : undefined,
    hasProtection: !!device.contractId,
  };
}

/** Hat der Haushalt dem Reparatur-Assistenten zugestimmt (und nicht widerrufen)? */
export function hasChatConsent(s: AppData): boolean {
  return s.consents.some((k) => k.purpose === 'chat_assistent' && !k.revokedAt);
}

/** Erste Fassung des Hinweises, in der Fotos stehen (Entscheidung 17) */
export const PHOTO_CONSENT_SINCE = '2026-11-1';

/** Deckt die Einwilligung auch Fotos ab? Ältere Fassungen nannten Fotos nicht. */
export function hasPhotoConsent(s: AppData): boolean {
  return s.consents.some(
    (k) => k.purpose === 'chat_assistent' && !k.revokedAt && k.textVersion >= PHOTO_CONSENT_SINCE,
  );
}
