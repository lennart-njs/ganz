// Versionierte Texte (ZUKUNFTSPLAN Phase 1): Ein geänderter Hinweis- oder Einwilligungstext ohne
// neue textVersion macht diese Datei rot.
//
// So änderst du einen Text: Wortlaut in i18n/de.ts ändern, in lib/legalTexts.ts die Version des
// Texts erhöhen und in __tests__/fixtures/text-versions.json unter seinem Schlüssel eine neue
// Zeile „Version: Hash“ ergänzen. Den Hash nennt der rote Test. Alte Zeilen nie ändern: Sie
// belegen, welchen Text eine Bestätigung mit dieser Version gezeigt hat.
import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';
import {
  LEGAL_TEXTS,
  LEGAL_TEXT_KEYS,
  PLACEHOLDER_NAMES,
  demoNames,
  legalText,
  templateHash,
  textStamp,
  type LegalTextKey,
} from '@/lib/legalTexts';
import { CONSENT_SCOPES } from '@/model/policies/consentScopes';
import { sha256Hex } from '@/model/sha256';

import history from './fixtures/text-versions.json';

const versions = history as Record<string, Record<string, string>>;

describe('Versionierte Texte', () => {
  // Die Tests unten ersetzen Texte und Umfang nur für sich
  afterEach(() => jest.restoreAllMocks());

  test.each(LEGAL_TEXT_KEYS)(
    '%s: der Text gleicht dem festgehaltenen Stand seiner Version',
    (key) => {
      const { version } = LEGAL_TEXTS[key];
      // Rot heißt: Der Text hat sich geändert, die Version nicht. Neue Version, neue Zeile.
      expect({ key, version, hash: templateHash(key) }).toEqual({
        key,
        version,
        hash: versions[key]?.[version],
      });
    },
  );

  test.each(LEGAL_TEXT_KEYS)('%s: die gültige Version ist die neueste festgehaltene', (key) => {
    const known = Object.keys(versions[key] ?? {});
    expect(known.at(-1)).toBe(LEGAL_TEXTS[key].version);
    for (const v of known) expect(v).toMatch(/^\d{4}-\d{2}-\d+$/);
  });

  test('jeder festgehaltene Text steht im Register', () => {
    expect(Object.keys(versions).sort()).toEqual([...LEGAL_TEXT_KEYS].sort());
  });

  test('ein geänderter Satz ändert den Hash, die Prüfung oben würde rot', () => {
    const key: LegalTextKey = 'fachkraft_videocall';
    const before = templateHash(key);
    // de ist „as const“, der Typ kennt nur den heutigen Wortlaut
    const help = de.help as { legalBasis: string };
    jest.replaceProperty(help, 'legalBasis', `${de.help.legalBasis} Neu.`);
    expect(templateHash(key)).not.toBe(before);
    expect(templateHash(key)).not.toBe(versions[key]![LEGAL_TEXTS[key].version]);
  });

  test('ein geänderter Umfang ändert den Hash, auch wenn kein Satz sich ändert', () => {
    const key: LegalTextKey = 'schadenmeldung';
    const before = templateHash(key);
    jest.replaceProperty(CONSENT_SCOPES, 'weitergabe_versicherer', {
      ...CONSENT_SCOPES.weitergabe_versicherer,
      dataCategories: [...CONSENT_SCOPES.weitergabe_versicherer.dataCategories, 'adresse'],
    });
    expect(templateHash(key)).not.toBe(before);
  });

  test('Namen gehören nicht zur Vorlage, wohl aber zum gespeicherten Hash', () => {
    const key: LegalTextKey = 'schadenmeldung';
    const other = { ...demoNames(), versicherer: 'Andere Versicherung' };
    expect(legalText(key, other)).not.toBe(legalText(key));
    expect(textStamp(key, other).textVersion).toBe(textStamp(key).textVersion);
    expect(textStamp(key, other).textHash).not.toBe(textStamp(key).textHash);
    expect(templateHash(key)).toBe(sha256Hex(legalText(key, PLACEHOLDER_NAMES)));
  });

  test('der gespeicherte Hash ist der SHA-256 des gezeigten Texts mit den Namen der Demo', () => {
    for (const key of LEGAL_TEXT_KEYS) {
      expect(textStamp(key)).toEqual({
        textVersion: LEGAL_TEXTS[key].version,
        textHash: sha256Hex(legalText(key)),
      });
    }
    expect(legalText('schadenmeldung')).toContain(demoConfig.insurer.shortName);
  });
});
