// Was jede Weitergabe umfasst: Zweck → Rechtsgrundlage, Empfängerart und Datenkategorien
// (ZUKUNFTSPLAN Phase 1, „Datenschutz und Belegbarkeit“). Die Vorschau „Das geht an …“, die Liste
// im Hinweis und die gespeicherte Bestätigung nutzen dasselbe Array (R-14). Die Kategorien sind
// Schlüssel, ihre Bezeichnungen stehen in i18n/de.ts unter dataCategory. Phase 4 zieht das in die
// Registry unter compliance/.
// Kein Import aus react, expo, i18n, config oder store (ZUKUNFTSPLAN 3.1).
import type { Consent, ConsentPurpose, Id, PartnerKind, PartnerRef } from '../types';

/** Alle Datenkategorien, die eine Weitergabe nennen kann */
export const DATA_CATEGORIES = [
  'vertrag',
  'geraet',
  'typenschild',
  'seriennummer',
  'problem',
  'ergebnis',
  'schritte',
  'notiz',
  'nachrichten',
  'fotos',
  'standbilder',
  'befund',
  'kosten',
  'adresse',
  'schutz',
  'fallstand',
  'name',
  'kaufdatum',
  'versicherung',
  'termin',
  'verlauf',
  'nachrichten_haendler',
  'bewertung',
  'gespraechsfotos',
] as const;

export type DataCategory = (typeof DATA_CATEGORIES)[number];

export interface ConsentScope {
  /** 'vertrag' = Bestätigung einer angefragten Leistung (lit. b), 'einwilligung' = lit. a */
  readonly legalBasis: Consent['legalBasis'];
  /** Wer die Daten bekommt */
  readonly recipientKind: PartnerKind;
  /** Was er bekommt, in der Reihenfolge der Vorschau */
  readonly dataCategories: readonly DataCategory[];
}

/**
 * Je Zweck genau ein Umfang. Wer hier eine Kategorie ändert, ändert, was die Vorschau zeigt und
 * was die Bestätigung speichert. Der Hinweistext dazu bekommt dann eine neue textVersion.
 */
export const CONSENT_SCOPES: Readonly<Record<ConsentPurpose, ConsentScope>> = {
  weitergabe_fachkraft: {
    legalBasis: 'vertrag',
    recipientKind: 'betrieb',
    dataCategories: ['geraet', 'problem', 'ergebnis', 'schritte', 'notiz', 'fotos'],
  },
  weitergabe_versicherer: {
    legalBasis: 'vertrag',
    recipientKind: 'versicherer',
    dataCategories: [
      'vertrag',
      'geraet',
      'problem',
      'ergebnis',
      'schritte',
      'fotos',
      'befund',
      'kosten',
    ],
  },
  weitergabe_betrieb: {
    legalBasis: 'vertrag',
    recipientKind: 'betrieb',
    dataCategories: ['geraet', 'typenschild', 'fotos', 'befund', 'schritte', 'adresse'],
  },
  /**
   * Fall an den Händler, bei dem das Gerät gekauft wurde (Entscheidung 28). Genau das, was
   * lib/sharing.ts buildSharedCaseFile sendet, auch Schutz, Verlauf und Bewertung.
   */
  weitergabe_haendler: {
    legalBasis: 'vertrag',
    recipientKind: 'haendler',
    dataCategories: [
      'name',
      'adresse',
      'geraet',
      'typenschild',
      'seriennummer',
      'kaufdatum',
      'versicherung',
      'problem',
      'ergebnis',
      'schritte',
      'notiz',
      'fotos',
      'befund',
      'kosten',
      'termin',
      'verlauf',
      'nachrichten_haendler',
      'bewertung',
    ],
  },
  screenshots_im_call: {
    legalBasis: 'einwilligung',
    recipientKind: 'betrieb',
    dataCategories: ['standbilder'],
  },
  hersteller_einzelfall: {
    legalBasis: 'einwilligung',
    recipientKind: 'hersteller',
    dataCategories: ['geraet', 'seriennummer', 'problem', 'befund'],
  },
  /** Lokale Mitteilungen auf diesem Telefon. Absender ist mach’s, die Daten verlassen das Telefon nicht. */
  mitteilungen: {
    legalBasis: 'einwilligung',
    recipientKind: 'dienstleister',
    dataCategories: ['fallstand'],
  },
  /**
   * Was lib/chat/context.ts mitschickt, dazu die Nachrichten selbst und die Fotos, die du im
   * Gespräch aufnimmst (Entscheidung 26). Ein Foto geht nur mit dieser Kategorie in der Bestätigung.
   */
  chat_assistent: {
    legalBasis: 'einwilligung',
    recipientKind: 'dienstleister',
    dataCategories: [
      'nachrichten',
      'gespraechsfotos',
      'geraet',
      'problem',
      'ergebnis',
      'schritte',
      'schutz',
    ],
  },
};

/** Eine Bestätigung, wie der Store sie speichert, ohne Nummer, Person und Zeit */
export type ConsentDraft = Omit<Consent, 'id' | 'personId' | 'grantedAt'>;

/** Welcher Text gezeigt wurde: Version und SHA-256 (lib/legalTexts.ts, textStamp) */
export type TextStamp = Pick<Consent, 'textVersion' | 'textHash'>;

export interface ScopedConsentInput {
  /** Ohne Fall gilt sie für alle Fälle, etwa beim Reparatur-Assistenten */
  caseId?: Id;
  recipient: PartnerRef;
  text: TextStamp;
}

/**
 * Baut die Bestätigung für einen Zweck. Rechtsgrundlage und Kategorien kommen nur aus
 * CONSENT_SCOPES, nie vom Aufrufer. Das Array ist eine Kopie.
 */
export function scopedConsent(purpose: ConsentPurpose, input: ScopedConsentInput): ConsentDraft {
  const scope = CONSENT_SCOPES[purpose];
  return {
    ...(input.caseId ? { caseId: input.caseId } : {}),
    purpose,
    legalBasis: scope.legalBasis,
    recipient: input.recipient,
    dataCategories: [...scope.dataCategories],
    textVersion: input.text.textVersion,
    ...(input.text.textHash ? { textHash: input.text.textHash } : {}),
  };
}
