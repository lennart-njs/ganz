import {
  CONSENT_SCOPES,
  DATA_CATEGORIES,
  scopedConsent,
  type DataCategory,
} from '@/model/policies/consentScopes';
import type { Consent, ConsentPurpose, PartnerKind } from '@/model/types';

/** Je Zweck: Rechtsgrundlage, Empfängerart und Kategorien, wie sie Vorschau und Bestätigung nutzen */
const expected: [ConsentPurpose, Consent['legalBasis'], PartnerKind, DataCategory[]][] = [
  [
    'weitergabe_fachkraft',
    'vertrag',
    'betrieb',
    ['geraet', 'problem', 'ergebnis', 'schritte', 'notiz', 'fotos'],
  ],
  [
    'weitergabe_versicherer',
    'vertrag',
    'versicherer',
    ['vertrag', 'geraet', 'problem', 'ergebnis', 'schritte', 'fotos', 'befund', 'kosten'],
  ],
  [
    'weitergabe_betrieb',
    'vertrag',
    'betrieb',
    ['geraet', 'typenschild', 'fotos', 'befund', 'schritte', 'adresse'],
  ],
  ['screenshots_im_call', 'einwilligung', 'betrieb', ['standbilder']],
  [
    'hersteller_einzelfall',
    'einwilligung',
    'hersteller',
    ['geraet', 'seriennummer', 'problem', 'befund'],
  ],
  ['mitteilungen', 'einwilligung', 'dienstleister', ['fallstand']],
  [
    'chat_assistent',
    'einwilligung',
    'dienstleister',
    ['nachrichten', 'geraet', 'problem', 'ergebnis', 'schritte', 'schutz'],
  ],
];

describe('consentScopes: ein Umfang je Zweck', () => {
  test('jeder Zweck hat genau einen Eintrag in der Tabelle', () => {
    expect(expected.map(([purpose]) => purpose).sort()).toEqual(Object.keys(CONSENT_SCOPES).sort());
  });

  test.each(expected)('%s: %s, an %s, mit %j', (purpose, legalBasis, recipientKind, categories) => {
    expect(CONSENT_SCOPES[purpose]).toEqual({
      legalBasis,
      recipientKind,
      dataCategories: categories,
    });
  });

  test.each(Object.entries(CONSENT_SCOPES))(
    '%s: Kategorien aus der Liste, keine doppelt, keine leer',
    (_, scope) => {
      expect(scope.dataCategories.length).toBeGreaterThan(0);
      expect(new Set(scope.dataCategories).size).toBe(scope.dataCategories.length);
      for (const key of scope.dataCategories) expect(DATA_CATEGORIES).toContain(key);
    },
  );

  test('Weitergaben für eine Anfrage sind lit. b, alles Freiwillige ist lit. a', () => {
    for (const [purpose, scope] of Object.entries(CONSENT_SCOPES)) {
      expect([purpose, scope.legalBasis]).toEqual([
        purpose,
        purpose.startsWith('weitergabe_') ? 'vertrag' : 'einwilligung',
      ]);
    }
  });
});

describe('scopedConsent', () => {
  const recipient = { id: 'kranich', kind: 'versicherer' as const, name: 'Kranich' };

  test.each(expected)('%s: Rechtsgrundlage und Kategorien kommen aus dem Umfang', (purpose) => {
    const text = { textVersion: 'v1', textHash: 'a'.repeat(64) };
    const draft = scopedConsent(purpose, { caseId: 'GS-1', recipient, text });
    expect(draft).toEqual({
      caseId: 'GS-1',
      purpose,
      legalBasis: CONSENT_SCOPES[purpose].legalBasis,
      recipient,
      dataCategories: [...CONSENT_SCOPES[purpose].dataCategories],
      textVersion: 'v1',
      textHash: 'a'.repeat(64),
    });
  });

  test('ohne Fall fehlt caseId ganz, die Kategorien sind eine Kopie', () => {
    const draft = scopedConsent('chat_assistent', { recipient, text: { textVersion: 'v1' } });
    expect('caseId' in draft).toBe(false);
    expect('textHash' in draft).toBe(false);
    expect(draft.dataCategories).not.toBe(CONSENT_SCOPES.chat_assistent.dataCategories);
    draft.dataCategories.push('adresse');
    expect(CONSENT_SCOPES.chat_assistent.dataCategories).not.toContain('adresse');
  });
});
