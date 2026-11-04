// Schlüssel, die der Reparatur-Assistent über den Fall bekommt, und wofür jeder steht.
// App und Route lesen dieselben Listen: Die App schickt nur Werte daraus (lib/chat/context.ts),
// die Route lehnt andere mit 400 ab und baut den Systemblock nur daraus (lib/chat/prompt.ts).
import { demoConfig } from '@/config/demo.config';
import { guides, type GuideId } from '@/data/guides';
import { de } from '@/i18n/de';
import type { DeviceCategory, GuideRun } from '@/model/types';

/** Gerätearten */
export const CHAT_CATEGORIES = Object.keys(de.deviceCategory) as [
  DeviceCategory,
  ...DeviceCategory[],
];

/** Anleitungen aus dem Katalog */
export const CHAT_GUIDE_IDS = Object.keys(guides) as [GuideId, ...GuideId[]];

/** Hersteller, die der Prototyp kennt: Schlüssel und Name */
export const CHAT_MANUFACTURERS: Readonly<Record<string, string>> = {
  [demoConfig.manufacturer.id]: demoConfig.manufacturer.name,
};
export const CHAT_MANUFACTURER_IDS = Object.keys(CHAT_MANUFACTURERS) as [string, ...string[]];

/** Modelle, die der Prototyp kennt. Ein anderes Modell nennt der Haushalt selbst. */
export const CHAT_MODELS: readonly string[] = [demoConfig.device.model];

/** Fehlerbilder der Intelligenten Fehlererkennung mit ihrem Bauteil */
export type ChatErrorPattern = keyof typeof de.result.component;
export const CHAT_ERROR_PATTERNS = Object.keys(de.result.component) as [
  ChatErrorPattern,
  ...ChatErrorPattern[],
];

/** Meldungen im Display aus dem Katalog */
export const CHAT_DISPLAY_MESSAGES = de.displayMessages.map((m) => m.code) as [string, ...string[]];

/** Wie eine Anleitung enden kann */
export type ChatGuideOutcome = NonNullable<GuideRun['outcome']>;
export const CHAT_GUIDE_OUTCOMES = Object.keys(de.file.event.outcome) as [
  ChatGuideOutcome,
  ...ChatGuideOutcome[],
];

export const isKnownModel = (model: string) => CHAT_MODELS.includes(model);

export const isChatErrorPattern = (v: string | undefined): v is ChatErrorPattern =>
  !!v && (CHAT_ERROR_PATTERNS as string[]).includes(v);
