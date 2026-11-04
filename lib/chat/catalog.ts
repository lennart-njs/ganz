// Schlüssel, die der Reparatur-Assistent über den Fall bekommt, und wofür jeder steht.
// App und Route lesen dieselben Listen: Die App schickt nur Werte daraus (lib/chat/context.ts),
// die Route lehnt andere mit 400 ab und baut den Systemblock nur daraus (lib/chat/prompt.ts).
// Anleitungen kommen aus dem Katalog (Entscheidung 24). Er kann auf dem Server wachsen, darum gibt
// es für Anleitungen nur eine Form, die Route sucht sie im Katalog des Geräts.
import { demoConfig } from '@/config/demo.config';
import { catalog, manufacturers } from '@/data/catalog';
import { de } from '@/i18n/de';
import type { DeviceCategory, GuideRun } from '@/model/types';

/** Gerätearten */
export const CHAT_CATEGORIES = Object.keys(de.deviceCategory) as [
  DeviceCategory,
  ...DeviceCategory[],
];

/** Form einer Anleitungs-Id. Ob es sie für das Gerät gibt, prüft die Route im Katalog. */
export const CHAT_GUIDE_ID = /^[A-Za-z0-9_-]{1,60}$/;

/** Hersteller, die die App kennt: Schlüssel und Name */
export const CHAT_MANUFACTURERS: Readonly<Record<string, string>> = {
  ...manufacturers,
  [demoConfig.manufacturer.id]: demoConfig.manufacturer.name,
};
export const CHAT_MANUFACTURER_IDS = Object.keys(CHAT_MANUFACTURERS) as [string, ...string[]];

/** Modelle, die die App kennt. Ein anderes Modell nennt der Haushalt selbst. */
export const CHAT_MODELS: readonly string[] = [
  ...new Set([demoConfig.device.model, ...catalog.map((m) => m.model)]),
];

/** Fehlerbilder der Intelligenten Fehlererkennung mit ihrem Bauteil */
export type ChatErrorPattern = keyof typeof de.result.component;
export const CHAT_ERROR_PATTERNS = Object.keys(de.result.component) as [
  ChatErrorPattern,
  ...ChatErrorPattern[],
];

/** Meldungen im Display: die der Demo und die aus den Gebrauchsanweisungen im Katalog */
export const CHAT_DISPLAY_MESSAGES = [
  ...new Set([
    ...de.displayMessages.map((m) => m.code),
    ...catalog.flatMap((m) => (m.messages ?? []).map((x) => x.code)),
  ]),
] as [string, ...string[]];

/** Wie eine Anleitung enden kann */
export type ChatGuideOutcome = NonNullable<GuideRun['outcome']>;
export const CHAT_GUIDE_OUTCOMES = Object.keys(de.file.event.outcome) as [
  ChatGuideOutcome,
  ...ChatGuideOutcome[],
];

export const isKnownModel = (model: string) => CHAT_MODELS.includes(model);

export const isChatErrorPattern = (v: string | undefined): v is ChatErrorPattern =>
  !!v && (CHAT_ERROR_PATTERNS as string[]).includes(v);
