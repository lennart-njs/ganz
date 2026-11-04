// Was der Reparatur-Assistent über den Fall erfährt. Bewusst ohne Adresse, Vertragsnummer und
// Fotos aus dem Fall. Ein Foto im Gespräch geht nur mit der Nachricht (lib/chat/useAssistant.ts).
import { demoConfig } from '@/config/demo.config';
import { latestDiagnosis, latestGuideRun } from '@/lib/caseView';
import { getGuide } from '@/lib/guideCatalog';
import type { Id, ISODateTime } from '@/model/types';
import type { AppData } from '@/store/appStore';

import { CHAT_DISPLAY_MESSAGES, CHAT_MANUFACTURERS, isChatErrorPattern } from './catalog';
import { chatLimits } from './limits';
import type { ChatContext } from './prompt';

/** Kürzt ein Feld auf die Länge, die die Route annimmt */
const clip = (text: string) => text.slice(0, chatLimits.field);

/**
 * Kontext für den Assistenten. Bis auf Problem und Modell sind es nur Schlüssel aus dem Katalog,
 * die Route baut daraus den Systemblock. Was der Katalog nicht kennt, bleibt weg.
 */
export function chatContext(s: AppData, caseId: Id): ChatContext | undefined {
  const c = s.cases[caseId];
  const device = s.devices.find((d) => d.id === c?.deviceId);
  if (!c || !device) return undefined;
  const result = latestDiagnosis(s, c, 'fehlererkennung') ?? latestDiagnosis(s, c, 'nutzerangabe');
  const run = latestGuideRun(s, c);
  const guide = run ? getGuide(run.guideId) : undefined;
  return {
    category: device.category,
    manufacturerId: device.manufacturerId in CHAT_MANUFACTURERS ? device.manufacturerId : undefined,
    model: clip(device.model),
    ...(device.materialNumber && /^[A-Za-z0-9 ./-]{1,40}$/.test(device.materialNumber)
      ? { materialNumber: device.materialNumber }
      : {}),
    problem: clip(c.problemLabel),
    errorPattern: isChatErrorPattern(result?.errorPattern) ? result.errorPattern : undefined,
    displayMessage: CHAT_DISPLAY_MESSAGES.find((m) => m === result?.displayMessage),
    guide:
      run && guide
        ? {
            id: run.guideId,
            step: Math.min(run.currentStep + 1, guide.steps.length),
            ended: run.outcome,
          }
        : undefined,
    hasProtection: !!device.contractId,
  };
}

/**
 * Hat der Haushalt dem Reparatur-Assistenten zugestimmt (und nicht widerrufen)? Die Einwilligung
 * gilt für alle Fälle und wird ohne Fall gespeichert (R-15).
 */
export function hasChatConsent(s: AppData): boolean {
  return s.consents.some((k) => k.purpose === 'chat_assistent' && !k.revokedAt);
}

/**
 * Deckt die Einwilligung Fotos im Gespräch? Nur, wenn ihr Umfang die Kategorie gespraechsfotos
 * nennt. Ältere Fassungen (auch die von mach’s ohne Stempel) nannten sie nicht, dann fragt das
 * Gespräch vor dem ersten Foto noch einmal. Kein Vergleich von Versionsnummern.
 */
export function hasPhotoConsent(s: AppData): boolean {
  return s.consents.some(
    (k) =>
      k.purpose === 'chat_assistent' &&
      !k.revokedAt &&
      (k.dataCategories as readonly string[]).includes('gespraechsfotos'),
  );
}

/** Was in einem Fall an den Reparatur-Assistenten ging, für die Fallakte */
export interface AssistantTransfer {
  /** Empfänger aus der Einwilligung */
  recipient: string;
  /** Deine Nachrichten in diesem Fall */
  count: number;
  /** Zeit der letzten Nachricht */
  lastAt: ISODateTime;
  /** Die Einwilligung ist inzwischen widerrufen */
  revokedAt?: ISODateTime;
}

/**
 * Die Weitergabe an den Assistenten in diesem Fall: jede eigene Nachricht, die mit dem Gespräch
 * an den Anbieter ging. Nachrichten, die nachweislich nicht dort ankamen (forwarded false), zählen
 * nicht. Ohne solche Nachricht im Fall gibt es keine Weitergabe (R-15).
 */
export function assistantTransfer(s: AppData, caseId: Id): AssistantTransfer | undefined {
  const sent = s.chatMessages.filter(
    (m) => m.caseId === caseId && m.role === 'haushalt' && m.forwarded !== false,
  );
  const last = sent.at(-1);
  if (!last) return undefined;
  const latest = s.consents.filter((k) => k.purpose === 'chat_assistent').at(-1);
  return {
    recipient: latest?.recipient.name ?? demoConfig.assistant.name,
    count: sent.length,
    lastAt: last.at,
    revokedAt: hasChatConsent(s) ? undefined : latest?.revokedAt,
  };
}
