// Versionierte Texte (ZUKUNFTSPLAN Phase 1): Ein geänderter Hinweis- oder Einwilligungstext ohne
// neue textVersion macht diese Datei rot.
//
// So änderst du einen Text: Wortlaut in i18n/de.ts ändern, in lib/legalTexts.ts die Version des
// Texts erhöhen und in __tests__/fixtures/text-versions.json unter seinem Schlüssel eine neue
// Zeile „Version: Hash“ ergänzen. Den Hash nennt der rote Test. Alte Zeilen nie ändern: Sie
// belegen, welchen Text eine Bestätigung mit dieser Version gezeigt hat.
import fs from 'fs';
import path from 'path';

import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';
import {
  LEGAL_TEXTS,
  LEGAL_TEXT_KEYS,
  PLACEHOLDER_NAMES,
  caseNames,
  demoNames,
  legalParts,
  legalText,
  templateHash,
  textStamp,
  type LegalTextKey,
} from '@/lib/legalTexts';
import { scopeList } from '@/lib/consent';
import { CONSENT_SCOPES } from '@/model/policies/consentScopes';
import { sha256Hex } from '@/model/sha256';
import { useAppStore } from '@/store/appStore';
import { APP } from '@/test/app';
import { addWasher, start } from '@/test/regressions';

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

  test('caseNames: die Namen, die der Fall zeigt, ohne Händler und Fremdversicherer die der Demo', () => {
    start();
    const s = useAppStore.getState();
    const kranich = s.createCase({ deviceId: addWasher().id, entry: 'foto', problemLabel: 'x' });
    // Gerät aus dem Vertrag der Demo: dieselben Namen, also dieselben Hashes wie bisher
    expect(caseNames(useAppStore.getState(), kranich.id)).toEqual(demoNames());

    // Gekauft bei Fründ, ohne Versicherung: Fachkraft und Betrieb sind sein Kundendienst
    const fruendDevice = s.addDevice({
      manufacturerId: 'miele',
      category: 'geschirrspueler',
      model: 'G 5833 SC',
      identifiedBy: 'katalog',
    });
    s.setDeviceDealer(fruendDevice.id, 'fruend');
    const fruend = s.createCase({ deviceId: fruendDevice.id, entry: 'foto', problemLabel: 'x' });
    const service = demoConfig.dealers[0]!.service!;
    expect(caseNames(useAppStore.getState(), fruend.id)).toEqual({
      ...demoNames(),
      fachkraft: service.expert,
      fachbetrieb: service.name,
    });

    // Eigene Police bei einem anderen Versicherer: dessen Kurzname, wie im Gespräch
    const other = demoConfig.insurers.find((i) => i.id !== demoConfig.insurer.id)!;
    const policyDevice = s.addDevice({
      manufacturerId: 'miele',
      category: 'trockner',
      model: 'TWB 140',
      identifiedBy: 'katalog',
    });
    s.linkPolicy({ deviceId: policyDevice.id, insurerId: other.id, policyNumber: 'P-1' });
    const policy = s.createCase({ deviceId: policyDevice.id, entry: 'foto', problemLabel: 'x' });
    const names = caseNames(useAppStore.getState(), policy.id);
    expect(names.versicherer).toBe(other.shortName);
    expect(legalText('schadenmeldung', names)).toContain(other.shortName);

    // Gekauft bei einem anderen Händler: Sein Name steht im Satz vor „Ja, senden“ und im Hash
    // (Übertragung 3.1). Ohne Händler am Gerät gibt es diesen Satz nicht.
    const lindemann = demoConfig.dealers.find((d) => d.id === 'lindemann')!;
    const elsewhere = s.addDevice({
      manufacturerId: 'miele',
      category: 'trockner',
      model: 'TWB 140',
      identifiedBy: 'katalog',
    });
    s.setDeviceDealer(elsewhere.id, lindemann.id);
    const bought = s.createCase({ deviceId: elsewhere.id, entry: 'foto', problemLabel: 'x' });
    const dealerNames = caseNames(useAppStore.getState(), bought.id);
    expect(dealerNames.haendler).toBe(lindemann.name);
    expect(legalParts('haendler_weitergabe', dealerNames)[0]).toBe(
      de.sharing.dataSummary(lindemann.name, scopeList('weitergabe_haendler')),
    );
    expect(textStamp('haendler_weitergabe', dealerNames).textHash).not.toBe(
      textStamp('haendler_weitergabe', caseNames(useAppStore.getState(), fruend.id)).textHash,
    );
    expect(legalText('haendler_weitergabe', PLACEHOLDER_NAMES)).toContain('{haendler}');
  });
});

// Ein Hinweis, den keine Bestätigung stempelt, belegt nur der Screen. Fiel er aus dem Screen,
// merkte es kein Test (Gegenprüfung zu Schritt 28: „Computerprogramm, kein Mensch“ fehlte).
describe('Hinweise ohne Bestätigung stehen auf dem Screen', () => {
  const ROOT = path.join(__dirname, '..');
  const files = (dir: string): string[] =>
    fs
      .readdirSync(dir, { withFileTypes: true })
      .flatMap((e) =>
        e.isDirectory()
          ? files(path.join(dir, e.name))
          : /\.tsx?$/.test(e.name)
            ? [path.join(dir, e.name)]
            : [],
      );
  const sources = ['app', 'components', 'hooks', 'lib', 'store']
    .flatMap((d) => files(path.join(ROOT, d)))
    .filter((f) => !f.endsWith(path.join('lib', 'legalTexts.ts')))
    .map((f) => fs.readFileSync(f, 'utf8'));
  /** Ein Schlüssel, den der Code nennt, geht in einen Stempel (textStamp, TRANSFER_TEXT, …) */
  const stamped = (key: LegalTextKey) => sources.some((src) => src.includes(`'${key}'`));

  const openCase = () => {
    start();
    const c = useAppStore.getState().createCase({
      deviceId: addWasher().id,
      entry: 'freitext',
      problemLabel: 'Es pumpt nicht ab.',
    });
    return c.id;
  };

  /** Wo der Hinweis steht, und wie man dorthin kommt */
  const SHOWN: Partial<Record<LegalTextKey, () => Promise<void>>> = {
    datenschutz_start: async () => {
      useAppStore.getState().reset();
      await renderRouter(APP, { initialUrl: '/willkommen' });
      await fireEvent.press(screen.getByRole('button', { name: de.onboarding.privacyTitle }));
    },
    datenschutz_profil: async () => {
      start();
      await renderRouter(APP, { initialUrl: '/profil' });
      await fireEvent.press(screen.getByRole('button', { name: de.profile.privacy }));
    },
    assistent_hinweis: async () => {
      const id = openCase();
      useAppStore.getState().addChatMessage({ caseId: id, role: 'haushalt', text: 'Hallo' });
      useAppStore.getState().addChatMessage({ caseId: id, role: 'assistent', text: 'Guten Tag' });
      await renderRouter(APP, { initialUrl: `/fall/${id}` });
    },
    eingabe_hinweis: async () => {
      await renderRouter(APP, { initialUrl: `/fall/${openCase()}` });
    },
  };

  test('jeder Text, den kein Code stempelt, hat hier seinen Screen', () => {
    expect(LEGAL_TEXT_KEYS.filter((k) => !stamped(k)).sort()).toEqual(Object.keys(SHOWN).sort());
  });

  test.each(Object.keys(SHOWN) as LegalTextKey[])(
    '%s: jeder Teil steht auf dem Screen',
    async (key) => {
      await SHOWN[key]!();
      for (const part of legalParts(key)) {
        expect(screen.getAllByText(part).length).toBeGreaterThan(0);
      }
    },
  );
});
