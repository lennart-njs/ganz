// Was der Reparatur-Assistent über den Fall erfährt. Bewusst ohne Adresse, Fotos und Vertragsnummer.
import { demoConfig } from '@/config/demo.config';
import { guides, type GuideId } from '@/data/guides';
import { de } from '@/i18n/de';
import { latestDiagnosis, latestGuideRun } from '@/lib/caseView';
import { getManufacturer } from '@/lib/devices';
import type { Id, ISODateTime } from '@/model/types';
import type { AppData } from '@/store/appStore';

import type { ChatContext } from './prompt';

export function chatContext(s: AppData, caseId: Id): ChatContext | undefined {
  const c = s.cases[caseId];
  const device = s.devices.find((d) => d.id === c?.deviceId);
  if (!c || !device) return undefined;
  const result = latestDiagnosis(s, c, 'fehlererkennung') ?? latestDiagnosis(s, c, 'nutzerangabe');
  const run = latestGuideRun(s, c);
  const guide = run ? guides[run.guideId as GuideId] : undefined;
  return {
    category: device.category,
    categoryLabel: de.deviceCategory[device.category],
    device: device.model,
    manufacturer: getManufacturer(device.manufacturerId).name,
    problem: c.problemLabel,
    result: result?.component,
    displayMessage: result?.displayMessage,
    guide:
      run && guide
        ? {
            id: run.guideId as GuideId,
            title: guide.title,
            step: Math.min(run.currentStep + 1, guide.steps.length),
            total: guide.steps.length,
            ended: run.outcome ? de.file.event.outcome[run.outcome] : undefined,
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
