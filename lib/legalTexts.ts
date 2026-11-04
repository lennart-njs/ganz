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
  /** Profil: „Datenschutz“. 2026-11-1: Name mach’s statt ganz. */
  datenschutz_profil: {
    version: '2026-11-1',
    parts: () => [de.profile.privacyText],
  },
  /** Wer antwortet: ein Computerprogramm, kein Mensch. In der Einwilligung und an der ersten Antwort. */
  assistent_hinweis: {
    version: '2026-10-1',
    parts: () => [de.chat.who],
  },
  /** Unter dem Eingabefeld in „Problem melden“ und im Gespräch */
  eingabe_hinweis: {
    version: '2026-11-1',
    parts: () => [de.chat.inputNotice],
  },
  /**
   * Vor der ersten Nachricht an den Assistenten (lit. a). Mit dem Hinweis, dass ein
   * Computerprogramm antwortet (Art. 50 Abs. 1 KI-VO), so steht er im Gespräch.
   * 2026-11-4: Fotos, die du im Gespräch aufnimmst, gehören zum Umfang (Entscheidung 26).
   */
  assistent_einwilligung: {
    version: '2026-11-4',
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
   * Vor dem Videocall: was die Fachkraft sieht (lit. b). 2026-11-2: ein Satz mit den Kategorien
   * aus dem Umfang, die Karte „Fallakte“ steht unter „Details“ (Entscheidung 20).
   */
  fachkraft_videocall: {
    version: '2026-11-2',
    scope: 'weitergabe_fachkraft',
    parts: (n) => [
      de.help.shareSummary(n.fachkraft, n.fachbetrieb, scopeList('weitergabe_fachkraft')),
      de.help.legalBasis,
    ],
  },
  /** Sheet vor dem Rückruf (lit. b). Die Überschrift nennt nur das Zeitfenster. */
  fachkraft_rueckruf: {
    version: '2026-11-1',
    scope: 'weitergabe_fachkraft',
    parts: (n) => [
      de.waiting.confirmText,
      de.help.shareTitle(n.fachkraft, n.fachbetrieb),
      ...items('weitergabe_fachkraft'),
      de.help.legalBasis,
    ],
  },
  /** Kästchen „Screenshots als Nachweis erlauben“ (lit. a) */
  screenshots: {
    version: '2026-11-1',
    scope: 'screenshots_im_call',
    parts: () => [de.help.screenshots, de.help.screenshotsSub(scopeList('screenshots_im_call'))],
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
   * ohne Hash (docs/ANNAHMEN.md, Übertragung U5).
   */
  haendler_weitergabe: {
    version: '2026-11-4',
    scope: 'weitergabe_haendler',
    parts: (n) => [
      de.sharing.dataSummary(n.haendler, scopeList('weitergabe_haendler')),
      de.sharing.confirmText,
      de.sharing.legal,
    ],
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
