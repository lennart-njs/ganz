import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook } from '@testing-library/react-native';
import type { StateStorage } from 'zustand/middleware';

import { demoConfig } from '@/config/demo.config';
import { guides } from '@/data/guides';
import { hasChatConsent, hasPhotoConsent } from '@/lib/chat/context';
import { getGuide, resetCatalog } from '@/lib/guideCatalog';
import { buildSharedCaseFile, dealerConsent } from '@/lib/sharing';
import { can } from '@/model/policies/actions';
import { selectCaseFacts } from '@/model/policies/caseFacts';
import type { GuideCatalogEntry } from '@/model/types';
import { createAppStore, initialData, useAppStore, type AppStore } from '@/store/appStore';
import type { StoreEnv } from '@/store/env';
import {
  BACKUP_PREFIX,
  MIGRATIONS,
  migrateStoredState,
  STORE_KEY,
  STORE_VERSION,
  StoreLoadError,
} from '@/store/persistence';
import { parseStoredState } from '@/store/storedState';
import { useHydrated } from '@/store/useHydrated';
import { unwrap } from '@/test/result';

import storeMachsV1 from './fixtures/store-machs-v1.json';
import storeV1 from './fixtures/store-v1.json';

const NOW = '2026-10-26T19:42:00+01:00';

function memoryStorage(initial?: string): StateStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set(STORE_KEY, initial);
  return {
    data,
    getItem: async (k) => data.get(k) ?? null,
    setItem: async (k, v) => {
      data.set(k, v);
    },
    removeItem: async (k) => {
      data.delete(k);
    },
  };
}

function testEnv(): StoreEnv {
  let n = 0;
  return { now: () => NOW, newId: (p) => `${p}-${++n}` };
}

const backups = (storage: { data: Map<string, string> }) =>
  [...storage.data.entries()].filter(([k]) => k.startsWith(BACKUP_PREFIX));

/** Lädt einen frischen Store aus dem Speicher, wie beim Start der App. */
async function load(storage: StateStorage) {
  const store = createAppStore(storage, testEnv());
  await store.persist.rehydrate();
  return store;
}

const stored = (state: unknown, version = STORE_VERSION) => JSON.stringify({ state, version });

const problemOf = (store: AppStore) => {
  const { error } = store.loading.getState();
  return error instanceof StoreLoadError ? error.problem : error;
};

/** Ein Durchlauf, der jede Art von gespeicherten Daten anlegt */
function playThrough(store: AppStore) {
  const s = () => store.getState();
  s().completeOnboarding();
  s().setAppearance('dunkel');
  s().setNotifications('erlaubt');
  s().setDemo({ hints: false, dismissedHints: ['start'] });
  const contract = s().linkContract('vertragsnummer');
  const device = s().addDevice({
    manufacturerId: 'miele',
    category: 'waschmaschine',
    model: 'WKB 130',
    serialNumber: '123',
    identifiedBy: 'vertrag',
    contractId: contract.id,
  });

  // Fall 1: Foto, Ergebnis, Anleitung mit Abbruch, Fragen an den Assistenten, später weiter
  const a = s().createCase({ deviceId: device.id, entry: 'foto', problemLabel: 'Wasserablauf' });
  const photo = s().addPhoto({
    caseId: a.id,
    deviceId: device.id,
    purpose: 'display',
    source: 'in_app_camera',
    uri: 'file:///test.jpg',
    width: 1200,
    height: 900,
  });
  s().addDiagnosis({
    caseId: a.id,
    photoIds: [photo.id],
    mode: 'display',
    errorPattern: 'wasserablauf',
    displayMessage: guides.ablauf.code,
    component: 'Laugenfilter',
    confidence: 'hoch',
    confidenceScore: 0.92,
    source: 'fehlererkennung',
    guideId: 'ablauf',
  });
  const run = unwrap(s().startGuide(a.id, 'ablauf'));
  s().moveGuideStep(run.id, 'next');
  s().confirmSafety(run.id, 1);
  s().finishGuide(run.id, 'geht_nicht', 'Klappe klemmt');
  const chat = s().grantConsent({
    caseId: a.id,
    purpose: 'chat_assistent',
    legalBasis: 'einwilligung',
    recipient: { id: 'assistent', kind: 'dienstleister', name: 'Assistent' },
    dataCategories: ['Fragen'],
    textVersion: '1',
  });
  s().addChatMessage({ caseId: a.id, role: 'haushalt', text: 'Was jetzt?' });
  s().addChatMessage({
    caseId: a.id,
    role: 'assistent',
    text: 'Hol dir Hilfe.',
    suggestion: 'hilfe',
  });
  s().revokeConsent(chat.id);
  s().pauseCase(a.id);

  // Fall 2: Videocall, Befund, Schadenmeldung, Termin, Reparatur, Bewertung
  const b = s().createCase({ deviceId: device.id, entry: 'meldung', problemLabel: 'Wasserablauf' });
  s().escalate(b.id);
  const partner = demoConfig.partners[0]!;
  s().grantConsent({
    caseId: b.id,
    purpose: 'weitergabe_fachkraft',
    legalBasis: 'vertrag',
    recipient: { id: partner.id, kind: 'betrieb', name: partner.name },
    dataCategories: ['Fotos'],
    textVersion: '1',
  });
  const video = unwrap(s().requestVideoCall(b.id));
  unwrap(s().updateVideoCall(video.id, 'verbunden'));
  unwrap(s().updateVideoCall(video.id, 'beendet'));
  s().setFinding(b.id, 'reparatur', 'fachkraft');
  unwrap(s().reportClaim(b.id));
  const booking = unwrap(
    s().requestBooking({
      caseId: b.id,
      kind: 'reparatur',
      partnerId: partner.id,
      slotLabel: demoConfig.slots[0]!,
      selfPay: false,
    }),
  );
  while (s().simulateNext(b.id));
  s().confirmRepair(b.id, true);
  s().rateBooking(booking.id, 5);

  // Fall 3 (mach’s): Gerät aus dem Katalog, beim Händler gekauft, Fall an den Händler, Antworten
  // aus dem Portal, Nachricht und Frage mit Foto. Dazu ein Gerät mit Versicherung aus der Liste.
  s().addCatalogEntry(importedEntry);
  const bought = s().addDevice({
    manufacturerId: 'miele',
    category: 'trockner',
    model: 'TWB 140',
    identifiedBy: 'katalog',
  });
  s().setDeviceDealer(bought.id, demoConfig.dealers[0]!.id);
  const insured = s().addDevice({
    manufacturerId: 'miele',
    category: 'geschirrspueler',
    model: 'G 5833 SC',
    identifiedBy: 'katalog',
  });
  s().linkPolicy({
    deviceId: insured.id,
    insurerId: demoConfig.insurers[1]!.id,
    policyNumber: 'LV-0001',
  });
  const d = s().createCase({ deviceId: bought.id, entry: 'freitext', problemLabel: 'Flusen' });
  unwrap(s().escalate(d.id));
  unwrap(s().shareWithDealer(d.id, '2026-11-3'));
  s().updateShare(d.id, { token: 'token', syncedEvents: 1 });
  s().importRetailerEvents(d.id, [
    {
      id: 'haendler-1',
      caseId: d.id,
      type: 'haendler_rueckfrage',
      at: NOW,
      actor: { kind: 'haendler', name: demoConfig.dealers[0]!.name },
      payload: { question: 'Kaufbeleg?', options: ['Ja', 'Nein'] },
    },
  ]);
  const question = s().addPhoto({
    caseId: d.id,
    deviceId: bought.id,
    purpose: 'frage',
    source: 'in_app_camera',
    uri: 'file:///frage.jpg',
  });
  unwrap(s().messageDealer(d.id, 'Hier ist das Foto.', question.id));
  s().addChatMessage({ caseId: d.id, role: 'haushalt', text: 'Das Sieb?', photoId: question.id });
  s().addChatMessage({ caseId: d.id, role: 'assistent', text: 'Ja.', assessment: 'passt' });
}

/** Eintrag, wie ihn der Server nach dem Import freigibt. Nicht eingebaut. */
const importedEntry: GuideCatalogEntry = {
  id: 'test-twb140',
  manufacturerId: 'miele',
  category: 'trockner',
  models: ['TWB 140'],
  materialNumbers: [],
  document: { title: 'Gebrauchsanweisung TWB 140 (Test)', license: 'hersteller', pages: 2 },
  review: { status: 'freigegeben', by: 'Test', at: NOW },
  origin: 'import',
  guides: [
    {
      id: 'test-twb140/sieb',
      kind: 'pflege',
      title: 'Sieb reinigen',
      code: 'Sieb',
      sourceDocument: 'Gebrauchsanweisung TWB 140 (Test)',
      steps: [{ t: 'Tür öffnen', d: 'Öffne die Tür.', src: { page: 1, text: 'Tür öffnen.' } }],
    },
  ],
};

describe('Speicher laden', () => {
  test('leerer Speicher: geladen, Anfangsstand, keine Sicherung', async () => {
    const storage = memoryStorage();
    const store = await load(storage);
    expect(store.loading.getState().status).toBe('ok');
    expect(store.getState().cases).toEqual({});
    expect(store.getState().nextCaseNumber).toBe(initialData.nextCaseNumber);
    expect(backups(storage)).toEqual([]);
  });

  test('kaputtes JSON: Fehler statt Hänger, der Rohwert ist gesichert', async () => {
    const raw = '{"state":{"cases":';
    const storage = memoryStorage(raw);
    const store = await load(storage);
    expect(store.loading.getState().status).toBe('fehler');
    expect(problemOf(store)).toBe('json');
    expect(backups(storage)).toEqual([[`${BACKUP_PREFIX}${NOW}`, raw]]);
    // Nichts überschreibt den Stand, bevor jemand entscheidet
    expect(storage.data.get(STORE_KEY)).toBe(raw);
  });

  test('gültiges JSON mit falscher Form: Fehler statt Absturz, der Rohwert ist gesichert', async () => {
    const raw = stored({ ...initialData, cases: 5 });
    const storage = memoryStorage(raw);
    const store = await load(storage);
    expect(store.loading.getState().status).toBe('fehler');
    expect(problemOf(store)).toBe('form');
    expect(String(store.loading.getState().error)).toContain('cases');
    expect(store.getState().cases).toEqual({});
    expect(backups(storage)).toEqual([[`${BACKUP_PREFIX}${NOW}`, raw]]);
    expect(storage.data.get(STORE_KEY)).toBe(raw);
  });

  test.each([
    ['ein Fall ohne Status', { cases: { 'GS-1': { id: 'GS-1' } } }],
    ['ein unbekannter Status', { cases: { 'GS-1': { id: 'GS-1', status: 'kaputt' } } }],
    ['Ereignisse als Text', { events: 'viele' }],
    ['eine Einstellung mit falschem Typ', { demo: { hints: 'ja' } }],
  ])('falsche Form wird erkannt: %s', async (_name, state) => {
    const storage = memoryStorage(stored(state));
    const store = await load(storage);
    expect(store.loading.getState().status).toBe('fehler');
    expect(problemOf(store)).toBe('form');
    expect(backups(storage)).toHaveLength(1);
  });

  test('Version 99: Fehler statt Verwerfen, der Rohwert ist gesichert', async () => {
    const raw = stored(initialData, 99);
    const storage = memoryStorage(raw);
    const store = await load(storage);
    expect(store.loading.getState().status).toBe('fehler');
    expect(problemOf(store)).toBe('version');
    expect(backups(storage)).toEqual([[`${BACKUP_PREFIX}${NOW}`, raw]]);
    expect(storage.data.get(STORE_KEY)).toBe(raw);
  });

  test.each([
    ['eine Zahl', '5'],
    ['eine Liste', '[]'],
    ['ohne Version', JSON.stringify({ state: {} })],
    ['ohne state', JSON.stringify({ version: 1 })],
  ])('JSON ohne Umschlag ist kaputt: %s', async (_name, raw) => {
    const storage = memoryStorage(raw);
    const store = await load(storage);
    expect(store.loading.getState().status).toBe('fehler');
    expect(problemOf(store)).toBe('json');
    expect(backups(storage)).toEqual([[`${BACKUP_PREFIX}${NOW}`, raw]]);
  });

  test('scheitert schon das Lesen, gibt es einen Fehler und nichts zu sichern', async () => {
    const storage = memoryStorage();
    storage.getItem = async () => {
      throw new Error('Speicher nicht erreichbar');
    };
    const store = await load(storage);
    expect(store.loading.getState().status).toBe('fehler');
    expect(backups(storage)).toEqual([]);
  });

  test('ein älterer Stand ohne neue Felder lädt, merge ergänzt sie', async () => {
    const demo: Record<string, unknown> = { ...initialData.demo };
    const older: Record<string, unknown> = { ...initialData, onboardingDone: true, demo };
    delete older.chatMessages;
    delete older.appearance;
    delete demo.dismissedHints;
    const storage = memoryStorage(stored(older));
    const store = await load(storage);
    expect(store.loading.getState().status).toBe('ok');
    expect(store.getState().onboardingDone).toBe(true);
    expect(store.getState().chatMessages).toEqual([]);
    expect(store.getState().demo.dismissedHints).toEqual([]);
  });

  test('alles, was die App schreibt, besteht die Prüfung und kommt unverändert zurück', async () => {
    const storage = memoryStorage();
    const first = await load(storage);
    playThrough(first);
    const before = storage.data.get(STORE_KEY)!;
    expect(Object.keys(first.getState().cases)).toHaveLength(3);

    const second = await load(storage);
    expect(second.loading.getState().status).toBe('ok');
    expect(second.persist.getOptions().partialize!(second.getState())).toEqual(
      JSON.parse(before).state,
    );
    expect(backups(storage)).toEqual([]);
    // Die Felder aus der mach’s-Linie sind dabei, nicht nur leer
    const loaded = second.getState();
    expect(Object.keys(loaded.shares)).toHaveLength(1);
    expect(loaded.guideCatalog.map((e) => e.id)).toEqual([importedEntry.id]);
    expect(loaded.devices.filter((x) => x.soldBy)).toHaveLength(1);
    expect(loaded.events.some((e) => e.actor.kind === 'haendler')).toBe(true);
  });

  // Übertragung der ganz-Linie (docs/ANNAHMEN.md): Ein Telefon mit dem Stand der mach’s-App vor
  // dem Merge startet ohne Hinweis, und nichts geht still verloren. Die Datei ist ein Stand, den
  // die mach’s-App (67d2fd8) mit Händler, Katalog und Fotos im Gespräch geschrieben hat.
  test('ein Stand der mach’s-App lädt ohne Fehler, Händler, Katalog und Fotos bleiben', async () => {
    resetCatalog();
    const entry = storeMachsV1.state.guideCatalog[0]!;
    const guideId = entry.guides[0]!.id;
    expect(getGuide(guideId)).toBeUndefined();

    // Derselbe Schlüssel wie in der mach’s-App, sonst sähe das Telefon leer aus
    expect(STORE_KEY).toBe('machs-app');
    expect(STORE_VERSION).toBe(storeMachsV1.version);
    const raw = JSON.stringify(storeMachsV1);
    const storage = memoryStorage(raw);
    const store = await load(storage);
    expect(store.loading.getState()).toEqual({ status: 'ok' });
    expect(backups(storage)).toEqual([]);

    // Nichts fehlt: Was die App wieder schreibt, ist der gespeicherte Stand plus neue Einstellungen
    const s = store.getState();
    expect(store.persist.getOptions().partialize!(s)).toEqual({
      ...storeMachsV1.state,
      demo: { ...initialData.demo, ...storeMachsV1.state.demo },
    });

    // Fall an Fründ: Freigabe, Token und Stand der Synchronisation bleiben
    const caseId = 'GS-24817';
    expect(s.shares[caseId]).toEqual(storeMachsV1.state.shares[caseId as 'GS-24817']);
    expect(s.shares[caseId]?.token).toBe('t');
    // Gerät beim Händler gekauft, aus dem Katalog erkannt
    expect(s.devices.map((x) => [x.identifiedBy, x.soldBy?.id])).toEqual([
      ['katalog', 'fruend'],
      ['katalog', 'lindemann'],
    ]);
    // Ereignisse aus dem Händlerportal und die Nachricht an den Händler
    expect(s.events.filter((e) => e.actor.kind === 'haendler').map((e) => e.type)).toEqual([
      'haendler_angenommen',
      'haendler_rueckfrage',
      'haendler_entscheidung',
      'haendler_termin',
      'haendler_ersatzteil',
      'haendler_nachricht',
      'haendler_betrieb',
      'haendler_status',
    ]);
    expect(s.events.some((e) => e.type === 'nachricht_an_haendler')).toBe(true);
    // Fotos zur Frage und die Einschätzung des Assistenten
    expect(s.photos.map((p) => p.purpose)).toEqual(['frage', 'frage']);
    expect(s.chatMessages.map((m) => [m.photoId !== undefined, m.assessment])).toEqual([
      [true, undefined],
      [false, 'passt'],
    ]);
    // Der Katalog-Eintrag vom Server steht nach dem Laden wieder zur Verfügung
    expect(getGuide(guideId)?.title).toBe(entry.guides[0]!.title);

    // Die Bestätigung an den Händler (Bezeichnungen, ohne Hash) gilt weiter. Die Akte lässt sich
    // bauen, „Fall an Fründ senden“ kommt also nicht noch einmal.
    const dealer = dealerConsent(s, caseId);
    expect(dealer?.id).toBe(s.shares[caseId]?.consentId);
    expect(dealer?.textHash).toBeUndefined();
    expect(buildSharedCaseFile(s, caseId, [], NOW)?.consentId).toBe(dealer?.id);
    // Nach den Regeln (Übertragung Schritt 3): Der Fall ist bei Fründ, du schreibst ihm weiter
    const facts = selectCaseFacts(s, caseId);
    expect(facts).toMatchObject({ dealerShared: true, soldBy: { id: 'fruend' } });
    expect(can(facts, 'an_haendler_senden')).toBe(false);
    expect(can(facts, 'haendler_schreiben')).toBe(true);
    // Die alte Einwilligung in den Assistenten gilt für Text, nicht für Fotos: Vor dem ersten
    // Foto fragt das Gespräch noch einmal (Kategorie gespraechsfotos)
    expect(hasChatConsent(s)).toBe(true);
    expect(hasPhotoConsent(s)).toBe(false);
  });

  test('erneut laden nach dem Fehler: einmal gesichert, mit heilem Speicher wieder geladen', async () => {
    const raw = stored({ cases: 5 });
    const storage = memoryStorage(raw);
    const store = await load(storage);
    await store.persist.rehydrate();
    expect(store.loading.getState().status).toBe('fehler');
    expect(backups(storage)).toHaveLength(1);

    storage.data.set(STORE_KEY, stored({ ...initialData, onboardingDone: true }));
    await store.persist.rehydrate();
    expect(store.loading.getState()).toEqual({ status: 'ok' });
    expect(store.getState().onboardingDone).toBe(true);
  });
});

describe('useHydrated', () => {
  test.each([
    ['leerer Speicher', undefined, 'ok'],
    ['kaputtes JSON', '{kaputt', 'fehler'],
    ['falsche Form', stored({ cases: 5 }), 'fehler'],
    ['Version 99', stored(initialData, 99), 'fehler'],
  ])('%s: nie ein Hänger in „laedt“', async (_name, raw, expected) => {
    const store = createAppStore(memoryStorage(raw), testEnv());
    const { result } = await renderHook(() => useHydrated(store));
    await act(async () => {
      await store.persist.rehydrate();
    });
    expect(result.current).toBe(expected);
  });

  test('der Store der App meldet den Fehler und nach heilem Speicher wieder „ok“', async () => {
    await act(async () => {
      await useAppStore.persist.rehydrate();
    });
    const { result } = await renderHook(() => useHydrated());
    expect(result.current).toBe('ok');

    await AsyncStorage.setItem(STORE_KEY, '{kaputt');
    await act(async () => {
      await useAppStore.persist.rehydrate();
    });
    expect(result.current).toBe('fehler');
    const keys = await AsyncStorage.getAllKeys();
    const backupKey = keys.find((k) => k.startsWith(BACKUP_PREFIX))!;
    expect(await AsyncStorage.getItem(backupKey)).toBe('{kaputt');

    await AsyncStorage.removeItem(STORE_KEY);
    await act(async () => {
      await useAppStore.persist.rehydrate();
    });
    expect(result.current).toBe('ok');
  });
});

describe('Migration', () => {
  test('STORE_VERSION steigt nie ohne Migration', () => {
    // Für jede Version vor der aktuellen gibt es einen Schritt auf die nächste
    for (let v = 1; v < STORE_VERSION; v++) {
      expect({ version: v, migration: typeof MIGRATIONS[v] }).toEqual({
        version: v,
        migration: 'function',
      });
    }
    expect(Object.keys(MIGRATIONS).map(Number)).toEqual(
      Array.from({ length: STORE_VERSION - 1 }, (_, i) => i + 1),
    );
  });

  test('ein Stand aus Version 1 kommt auf die aktuelle Version und besteht die Prüfung', () => {
    // Die Datei ist ein eingefrorener Stand, wie Version 1 ihn schreibt. Sie bleibt, wie sie ist.
    expect(storeV1.version).toBe(1);
    const migrated = migrateStoredState(storeV1.state, storeV1.version);
    expect(() => parseStoredState(migrated)).not.toThrow();
    expect(Object.keys(parseStoredState(migrated).cases ?? {})).toHaveLength(2);
  });

  test('auf der aktuellen Version ist migrate die Identität, heute Version 1', () => {
    const state = { cases: {} };
    expect(migrateStoredState(state, STORE_VERSION)).toBe(state);
  });

  test.each([0, 99, 1.5, -1])('unbekannte Version %p wirft', (version) => {
    expect(() => migrateStoredState({}, version)).toThrow(StoreLoadError);
  });
});
