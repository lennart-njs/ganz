// Versionierte Hinweis- und Einwilligungstexte (ZUKUNFTSPLAN Phase 1, „Versionierte Texte“).
// Die Texte selbst stehen in i18n/de.ts. Hier steht je Text, aus welchen Teilen er auf dem Screen
// besteht und welche Version gilt. Jede Bestätigung speichert textVersion und textHash, den
// SHA-256 des gezeigten Texts mit den echten Namen.
//
// Ändert sich ein Teil oder der Umfang aus consentScopes, braucht der Text eine neue Version.
// __tests__/legalTexts.test.ts vergleicht die Vorlage (mit Platzhaltern statt Namen) mit
// __tests__/fixtures/text-versions.json. Dort kommt je neue Version eine Zeile dazu. Alte Zeilen
// bleiben, wie sie sind: Sie belegen, was Bestätigungen mit dieser Version gezeigt haben.
// Phase 4 zieht das in die Registry unter compliance/, den Wortlaut legt der Anwalt fest.
//
// Entscheidung 38: Hinweise zur Weitergabe stehen nicht mehr im Gespräch, sondern im Profil.
// Wer was sieht, steht dort unter „Datenschutz“, die Einwilligung in den Assistenten unter
// „Freiwillig“. Im Gespräch bleibt der Tap. Der Stempel einer Weitergabe belegt deshalb, was beim
// Tap zu sehen war: die Antwort, auf die du getippt hast.
import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';
import { CONSENT_SCOPES, type TextStamp } from '@/model/policies/consentScopes';
import { sha256Hex } from '@/model/sha256';
import type { ConsentPurpose, Id } from '@/model/types';
import type { AppData } from '@/store/appStore';

import { scopeLabels, scopeList } from './consent';
import { caseService, insurerShortName } from './service';

/** Namen, die in den Texten stehen */
export interface TextNames {
  versicherer: string;
  fachkraft: string;
  fachbetrieb: string;
  assistent: string;
  hersteller: string;
  /** Händler, bei dem das Gerät gekauft wurde (Device.soldBy) */
  haendler: string;
}

interface LegalText {
  /** Jahr-Monat-laufende Nummer, z. B. „2026-11-1“. Neu bei jeder Änderung. */
  version: string;
  /** Die Teile, so wie der Screen sie zeigt, jeder für sich ein Text */
  parts: (n: TextNames) => string[];
  /** Zweck, dessen Kategorien der Text nennt oder als Vorschau zeigt. Sie gehören zum Text. */
  scope?: ConsentPurpose;
}

const items = (purpose: ConsentPurpose) => scopeLabels(purpose).map((l) => de.help.item(l));

/** Empfänger im Profil unter „Datenschutz“, je mit dem Umfang seiner Weitergabe (Entscheidung 38) */
export const PRIVACY_RECIPIENTS = [
  ['fachkraft', 'weitergabe_fachkraft'],
  ['haendler', 'weitergabe_haendler'],
  ['betrieb', 'weitergabe_betrieb'],
  ['versicherer', 'weitergabe_versicherer'],
] as const satisfies readonly (readonly [string, ConsentPurpose])[];

export const LEGAL_TEXTS = {
  /** Onboarding: „Was mit deinen Daten passiert“. 2026-11-1: Name mach’s statt ganz. */
  datenschutz_start: {
    version: '2026-11-1',
    parts: () => [
      de.onboarding.privacyTitle,
      de.onboarding.privacyText,
      de.onboarding.privacyBasis,
    ],
  },
  /**
   * Profil: „Datenschutz“. 2026-11-1: Name mach’s statt ganz. 2026-11-5: dazu, wer was sieht und
   * auf welcher Grundlage (Entscheidung 38). Das stand vorher vor jeder Weitergabe im Gespräch.
   */
  datenschutz_profil: {
    version: '2026-11-5',
    parts: () => [
      de.profile.privacyText,
      de.profile.privacyWho,
      ...PRIVACY_RECIPIENTS.map(([who, purpose]) =>
        de.profile.privacyRecipient(de.profile.recipients[who], scopeList(purpose)),
      ),
      de.profile.privacyShareBasis,
    ],
  },
  /**
   * Einwilligung in den Assistenten (lit. a), mit dem Hinweis, dass ein Computerprogramm antwortet
   * (Art. 50 Abs. 1 KI-VO). 2026-11-4: Fotos, die du im Gespräch aufnimmst, gehören zum Umfang
   * (Entscheidung 26). 2026-11-5: im Profil unter „Freiwillig“ und, solange sie fehlt, im Sheet
   * nach der ersten Nachricht. Dort steht derselbe Text (Entscheidung 38).
   */
  assistent_einwilligung: {
    version: '2026-11-5',
    scope: 'chat_assistent',
    parts: (n) => [
      de.chat.consentTitle,
      de.chat.who,
      de.chat.consentText(n.assistent),
      ...items('chat_assistent'),
      de.chat.consentExcluded,
      de.chat.consentBasis,
    ],
  },
  /**
   * Videocall (lit. b). 2026-11-2: ein Satz mit den Kategorien und die Grundlage vor dem Call.
   * 2026-11-5: nur die Antwort „Videocall starten“, wer was sieht steht im Profil (Entscheidung 38).
   */
  fachkraft_videocall: {
    version: '2026-11-5',
    scope: 'weitergabe_fachkraft',
    parts: () => [de.thread.callStart],
  },
  /**
   * Sheet vor dem Rückruf (lit. b). Die Überschrift nennt nur das Zeitfenster. 2026-11-5: ohne
   * Liste und Grundlage, die stehen im Profil (Entscheidung 38).
   */
  fachkraft_rueckruf: {
    version: '2026-11-5',
    scope: 'weitergabe_fachkraft',
    parts: () => [de.waiting.confirmText, de.waiting.requestCallback],
  },
  /** Kästchen „Screenshots als Nachweis erlauben“ (lit. a). 2026-11-5: ohne Unterzeile (Entscheidung 38). */
  screenshots: {
    version: '2026-11-5',
    scope: 'screenshots_im_call',
    parts: () => [de.help.screenshots],
  },
  /** Kosten und Gespräch: „Das geht an …“ und der Satz zur Meldung (lit. b) */
  schadenmeldung: {
    version: '2026-11-1',
    scope: 'weitergabe_versicherer',
    parts: (n) => [de.costs.preview(n.versicherer), de.costs.legal(n.versicherer)],
  },
  /** Termin: was der Betrieb bekommt (lit. b) */
  termin_betrieb: {
    version: '2026-11-1',
    scope: 'weitergabe_betrieb',
    parts: () => [de.appointment.shares(scopeList('weitergabe_betrieb'))],
  },
  /**
   * „Zahlungspflichtig buchen“ (§ 312j BGB, ganz Nr. 31): der Satz dazu und der Button.
   * Betrieb ist der gebuchte, nicht der Betrieb der Fachkraft. Zeitfenster, Auftrag und Betrag
   * hält das Ereignis zahlungspflichtig_gebucht daneben fest.
   */
  verbindliche_buchung: {
    version: '2026-11-1',
    parts: (n) => [de.appointment.bindingNotice(n.fachbetrieb), de.appointment.requestPaid],
  },
  /**
   * „Fall an … senden“ (lit. b, Entscheidung 28): ein Satz mit den Kategorien aus dem Umfang,
   * dann was nicht dabei ist und die Grundlage (Entscheidung 20). 2026-11-4: Umfang und Stempel
   * wie bei den anderen Weitergaben. Bis 2026-11-3 sechs Zeilen, gespeichert als Bezeichnungen
   * ohne Hash (docs/ANNAHMEN.md, Übertragung U5). 2026-11-5: nur noch die Antwort „Fall an …
   * senden“ und „Ja, senden“, wer was sieht steht im Profil (Entscheidung 38).
   */
  haendler_weitergabe: {
    version: '2026-11-5',
    scope: 'weitergabe_haendler',
    parts: (n) => [de.sharing.offer(n.haendler), de.sharing.send],
  },
  /** Profil: Einzelfälle an den Hersteller (lit. a) */
  hersteller_einzelfall: {
    version: '2026-11-1',
    scope: 'hersteller_einzelfall',
    parts: (n) => [
      de.profile.manufacturerCase(n.hersteller),
      de.profile.manufacturerCaseSub(scopeList('hersteller_einzelfall')),
    ],
  },
  /** Profil: das Kästchen „Mitteilungen zum Fall-Status“ (lit. a) */
  mitteilungen: {
    version: '2026-11-1',
    scope: 'mitteilungen',
    parts: () => [de.profile.notifications, de.profile.notificationsSub],
  },
  /**
   * Termin und Gespräch: der Satz vor „Termin anfragen“. Danach fragt das System, die Antwort im
   * Systemdialog ist die Einwilligung (lit. a). Gespeichert wird dieser Text, nicht der im Profil.
   * 2026-11-2: Name mach’s statt ganz.
   */
  mitteilungen_termin: {
    version: '2026-11-2',
    scope: 'mitteilungen',
    parts: () => [de.appointment.notificationsNotice],
  },
} satisfies Record<string, LegalText>;

export type LegalTextKey = keyof typeof LEGAL_TEXTS;

/**
 * Texte, die die App nicht mehr zeigt (Entscheidung 38). Ihre Zeilen in text-versions.json bleiben:
 * Sie belegen, was ältere Bestätigungen gezeigt haben.
 * - assistent_hinweis: „Ein Computerprogramm, kein Mensch …“ an der ersten Antwort. Der Satz steht
 *   weiter in der Einwilligung.
 * - eingabe_hinweis: „Was du hier schreibst, geht an den Reparatur-Assistenten.“
 */
export const RETIRED_TEXT_KEYS = ['assistent_hinweis', 'eingabe_hinweis'] as const;

export const LEGAL_TEXT_KEYS = Object.keys(LEGAL_TEXTS) as LegalTextKey[];

/** Die Namen, die die App heute zeigt: alle aus der Demo-Konfiguration */
export function demoNames(): TextNames {
  const partner = demoConfig.partners.find((p) => p.id === demoConfig.expert.partnerId);
  return {
    versicherer: demoConfig.insurer.shortName,
    fachkraft: demoConfig.expert.name,
    fachbetrieb: partner?.name ?? '',
    assistent: demoConfig.assistant.name,
    hersteller: demoConfig.manufacturer.name,
    haendler: demoConfig.dealers[0]?.name ?? '',
  };
}

/**
 * Die Namen, die der Screen im Fall zeigt: Versicherer aus dem Vertrag des Geräts, Fachkraft und
 * Betrieb aus lib/service.ts (beim Händler-Gerät sein Kundendienst, Entscheidung 16), Händler aus
 * dem Gerät. So belegt der Stempel denselben Text, den der Haushalt gesehen hat. Ohne Händler und
 * mit dem Versicherer der Konfiguration sind es dieselben Namen wie in demoNames(). Ohne Händler
 * am Gerät gibt es keinen Text, der ihn nennt (an_haendler_senden).
 */
export function caseNames(
  s: Pick<AppData, 'cases' | 'devices' | 'contracts'>,
  caseId: Id,
): TextNames {
  const { expert } = caseService(s, caseId);
  const names = demoNames();
  const device = s.devices.find((d) => d.id === s.cases[caseId]?.deviceId);
  return {
    ...names,
    versicherer: insurerShortName(s, caseId),
    fachkraft: expert.name,
    fachbetrieb: expert.partner.name,
    haendler: device?.soldBy?.name ?? names.haendler,
  };
}

/** Platzhalter statt Namen: Die Vorlage hängt nicht an der Demo-Konfiguration */
export const PLACEHOLDER_NAMES: TextNames = {
  versicherer: '{versicherer}',
  fachkraft: '{fachkraft}',
  fachbetrieb: '{fachbetrieb}',
  assistent: '{assistent}',
  hersteller: '{hersteller}',
  haendler: '{haendler}',
};

/** Die Teile, wie der Screen sie zeigt */
export function legalParts(key: LegalTextKey, names: TextNames = demoNames()): string[] {
  return LEGAL_TEXTS[key].parts(names);
}

/** Der ganze Text, über den der Hash läuft: Teile und, wo es einen gibt, der Umfang */
export function legalText(key: LegalTextKey, names: TextNames = demoNames()): string {
  const entry: LegalText = LEGAL_TEXTS[key];
  const scope = entry.scope ? CONSENT_SCOPES[entry.scope].dataCategories : undefined;
  return [...entry.parts(names), ...(scope ? [`dataCategories: ${scope.join(', ')}`] : [])].join(
    '\n',
  );
}

/** Version und Hash des gezeigten Texts, so wie die Bestätigung sie speichert */
export function textStamp(key: LegalTextKey, names: TextNames = demoNames()): TextStamp {
  return { textVersion: LEGAL_TEXTS[key].version, textHash: sha256Hex(legalText(key, names)) };
}

/** Hash der Vorlage mit Platzhaltern. Ihn hält __tests__/fixtures/text-versions.json fest. */
export function templateHash(key: LegalTextKey): string {
  return sha256Hex(legalText(key, PLACEHOLDER_NAMES));
}
