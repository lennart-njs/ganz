// Was der Reparatur-Assistent über den Fall erfährt. Bewusst ohne Adresse, Fotos und Vertragsnummer.
import { demoConfig } from '@/config/demo.config';
import { guides, type GuideId } from '@/data/guides';
import { latestDiagnosis, latestGuideRun } from '@/lib/caseView';
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
  const guide = run ? guides[run.guideId as GuideId] : undefined;
  return {
    category: device.category,
    manufacturerId: device.manufacturerId in CHAT_MANUFACTURERS ? device.manufacturerId : undefined,
    model: clip(device.model),
    problem: clip(c.problemLabel),
    errorPattern: isChatErrorPattern(result?.errorPattern) ? result.errorPattern : undefined,
    displayMessage: CHAT_DISPLAY_MESSAGES.find((m) => m === result?.displayMessage),
    guide:
      run && guide
        ? {
            id: run.guideId as GuideId,
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
 * Die Weitergabe an den Assistenten in diesem Fall: Jede eigene Nachricht ging mit dem Gespräch
 * an den Anbieter. Ohne Nachricht im Fall gibt es keine (R-15).
 */
export function assistantTransfer(s: AppData, caseId: Id): AssistantTransfer | undefined {
  const sent = s.chatMessages.filter((m) => m.caseId === caseId && m.role === 'haushalt');
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
