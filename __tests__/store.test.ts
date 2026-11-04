import type { StateStorage } from 'zustand/middleware';

import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';
import { demoNames, textStamp } from '@/lib/legalTexts';
import { resetCatalog } from '@/lib/guideCatalog';
import { availableActions, can } from '@/model/policies/actions';
import { selectCaseFacts } from '@/model/policies/caseFacts';
import { addMonths } from '@/model/policies/warranty';
import {
  createAppStore,
  nextSimulationDue,
  selectCaseEvents,
  selectOpenCases,
  type AppState,
} from '@/store/appStore';
import type { StoreEnv } from '@/store/env';
import { unwrap } from '@/test/result';

function memoryStorage(): StateStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
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
  return { now: () => '2026-10-26T19:42:00+01:00', newId: (p) => `${p}-${++n}` };
}

const recipient = { id: 'kranich', kind: 'versicherer' as const, name: 'Kranich Versicherung' };

describe('Store', () => {
  test('ein offener Fall übersteht den Neustart der App', async () => {
    const storage = memoryStorage();
    const first = createAppStore(storage, testEnv());
    await first.persist.rehydrate();
    const c = first
      .getState()
      .createCase({ deviceId: 'd-1', entry: 'foto', problemLabel: 'Wasserablauf' });
    first.getState().runCommand(c.id, 'anleitung_starten');
    first.getState().pauseCase(c.id);

    // „Neustart“: neuer Store auf demselben Speicher
    const second = createAppStore(storage, testEnv());
    await second.persist.rehydrate();
    const restored = second.getState().cases[c.id];
    expect(restored?.status).toBe('selbsthilfe');
    expect(restored?.pausedAt).toBeDefined();
    expect(selectOpenCases(second.getState()).map((x) => x.id)).toEqual([c.id]);
    expect(selectCaseEvents(second.getState(), c.id).map((e) => e.type)).toEqual([
      'fall_angelegt',
      'anleitung_gestartet',
      'status_geaendert',
      'pausiert',
    ]);
  });

  test('die erste Fallnummer kommt aus der Konfiguration', () => {
    const store = createAppStore(memoryStorage(), testEnv());
    const a = store.getState().createCase({ deviceId: 'd', entry: 'foto', problemLabel: 'x' });
    const b = store.getState().createCase({ deviceId: 'd', entry: 'foto', problemLabel: 'x' });
    expect([a.id, b.id]).toEqual(['GS-24817', 'GS-24818']);
  });

  test('Schadenfall nur nach eigener Bestätigung, Widerruf erzeugt ein Ereignis', () => {
    const store = createAppStore(memoryStorage(), testEnv());
    const s = () => store.getState();
    const c = s().createCase({ deviceId: 'd', entry: 'foto', problemLabel: 'x' });
    s().runCommand(c.id, 'hilfe_holen');
    expect(s().runCommand(c.id, 'schaden_melden', { contractId: 'k-1' })).toEqual({
      ok: false,
      refusal: { code: 'bestaetigung', purpose: 'weitergabe_versicherer' },
    });
    expect(s().cases[c.id]?.status).toBe('eskaliert');
    const consent = s().grantConsent({
      caseId: c.id,
      purpose: 'weitergabe_versicherer',
      legalBasis: 'vertrag',
      recipient,
      dataCategories: ['Fotos', 'Protokoll', 'Befund'],
      textVersion: '1',
    });
    expect(unwrap(s().runCommand(c.id, 'schaden_melden', { contractId: 'k-1' })).status).toBe(
      'freigabe_noetig',
    );
    s().revokeConsent(consent.id);
    expect(s().consents[0]?.revokedAt).toBeDefined();
    expect(selectCaseEvents(s(), c.id).map((e) => e.type)).toContain('einwilligung_widerrufen');
  });

  test('Haushalt und Person entstehen einmal', () => {
    const store = createAppStore(memoryStorage(), testEnv());
    const a = store.getState().ensureHousehold();
    const b = store.getState().ensureHousehold();
    expect(a.id).toBe(b.id);
    expect(a.role).toBe('versicherungsnehmer');
    expect(store.getState().household?.address?.city).toBe(demoConfig.household.address.city);
  });
});

describe('openCaseFor: ein offener Fall pro Gerät (Entscheidung Nr. 13)', () => {
  const setup = () => {
    const store = createAppStore(memoryStorage(), testEnv());
    return { store, s: () => store.getState() };
  };
  const openOf = (state: ReturnType<typeof setup>['s'], deviceId: string) =>
    selectOpenCases(state()).filter((c) => c.deviceId === deviceId);

  test('ohne offenen Fall: ein neuer Fall', () => {
    const { s } = setup();
    const r = unwrap(s().openCaseFor('d-1', 'symptom', 'Wäsche noch nass'));
    expect(r.art).toBe('neu');
    expect(s().cases[r.caseId]).toMatchObject({
      deviceId: 'd-1',
      entry: 'symptom',
      problemLabel: 'Wäsche noch nass',
      status: 'offen',
    });
  });

  test('ohne Fortschritt: derselbe Fall mit dem neuen Problem, auch nach einer Pause', () => {
    const { s } = setup();
    const first = unwrap(s().openCaseFor('d-1', 'symptom', 'Wäsche noch nass'));
    s().pauseCase(first.caseId);
    const r = unwrap(s().openCaseFor('d-1', 'foto', 'Foto vom Display'));
    expect(r).toEqual({ art: 'ersetzt', caseId: first.caseId });
    expect(s().cases[r.caseId]).toMatchObject({ entry: 'foto', problemLabel: 'Foto vom Display' });
    expect(s().cases[r.caseId]?.pausedAt).toBeUndefined();
    expect(openOf(s, 'd-1')).toHaveLength(1);
  });

  test('mit Fortschritt: nichts ändert sich, mach’s fragt', () => {
    const { s } = setup();
    const first = unwrap(s().openCaseFor('d-1', 'symptom', 'Wäsche noch nass'));
    s().runCommand(first.caseId, 'hilfe_holen');
    const before = s().events.length;
    expect(unwrap(s().openCaseFor('d-1', 'symptom', 'Tür geht nicht auf'))).toEqual({
      art: 'frage_weitermachen',
      caseId: first.caseId,
    });
    expect(s().events).toHaveLength(before);
    expect(s().cases[first.caseId]?.problemLabel).toBe('Wäsche noch nass');
  });

  test('„Neues Problem melden“: der alte Fall wird abgebrochen, dann gibt es einen neuen', () => {
    const { s } = setup();
    const first = unwrap(s().openCaseFor('d-1', 'symptom', 'Wäsche noch nass'));
    s().runCommand(first.caseId, 'hilfe_holen');
    const r = unwrap(
      s().openCaseFor('d-1', 'symptom', 'Tür geht nicht auf', { neuesProblem: true }),
    );
    expect(r.art).toBe('neu');
    expect(r.caseId).not.toBe(first.caseId);
    expect(s().cases[first.caseId]).toMatchObject({
      status: 'abgebrochen',
      cancelReason: de.thread.newProblemReason,
    });
    expect(openOf(s, 'd-1').map((c) => c.id)).toEqual([r.caseId]);
  });

  // Seit Nr. 34 lässt sich die Reparatur abbrechen, aber nur im Fall selbst, wo die Absage an den
  // Betrieb dabeisteht. „Neues Problem melden“ bricht einen Auftrag nicht nebenbei ab.
  test('in der Reparatur mit Auftrag: kein Abbruch nebenbei, kein Absturz, nur die Frage', () => {
    const { s } = setup();
    const first = unwrap(s().openCaseFor('d-1', 'symptom', 'Wäsche noch nass'));
    unwrap(s().runCommand(first.caseId, 'hilfe_holen'));
    unwrap(s().setFinding(first.caseId, 'reparatur', 'fachkraft'));
    const booking = unwrap(
      s().requestBooking({
        caseId: first.caseId,
        kind: 'reparatur',
        partnerId: demoConfig.partners[0]!.id,
        slotLabel: demoConfig.slots[0],
        selfPay: true,
      }),
    );
    expect(selectCaseFacts(s(), first.caseId)?.order?.id).toBe(booking.id);
    const r = unwrap(
      s().openCaseFor('d-1', 'symptom', 'Tür geht nicht auf', { neuesProblem: true }),
    );
    expect(r).toEqual({ art: 'frage_weitermachen', caseId: first.caseId });
    expect(s().cases[first.caseId]?.status).toBe('in_reparatur');
    expect(s().bookings.find((b) => b.id === booking.id)?.status).toBe('angefragt');
    expect(openOf(s, 'd-1')).toHaveLength(1);
  });

  test('das Problem des eigenen Falls ändern („Passt nicht“): derselbe Fall, auch mit Foto', () => {
    const { s } = setup();
    const first = unwrap(s().openCaseFor('d-1', 'foto', 'Foto vom Display'));
    s().addPhoto({
      caseId: first.caseId,
      deviceId: 'd-1',
      purpose: 'display',
      source: 'in_app_camera',
      uri: '',
    });
    expect(unwrap(s().openCaseFor('d-1', 'symptom', 'Tür geht nicht auf')).art).toBe(
      'frage_weitermachen',
    );
    const r = unwrap(
      s().openCaseFor('d-1', 'symptom', 'Tür geht nicht auf', { aendern: first.caseId }),
    );
    expect(r).toEqual({ art: 'ersetzt', caseId: first.caseId });
    expect(s().cases[r.caseId]).toMatchObject({ entry: 'symptom', photoIds: [expect.any(String)] });
    expect(openOf(s, 'd-1')).toHaveLength(1);
  });

  test('ein anderes Gerät bleibt unberührt', () => {
    const { s } = setup();
    const a = unwrap(s().openCaseFor('d-1', 'symptom', 'Wäsche noch nass'));
    const b = unwrap(s().openCaseFor('d-2', 'symptom', 'Tür geht nicht auf'));
    expect([a.art, b.art]).toEqual(['neu', 'neu']);
    expect(s().cases[a.caseId]?.problemLabel).toBe('Wäsche noch nass');
  });
});

describe('startGuide: nie zwei offene Anleitungen (B-05, R-06)', () => {
  const setup = () => {
    const store = createAppStore(memoryStorage(), testEnv());
    const s = () => store.getState();
    const id = unwrap(s().openCaseFor('d-1', 'symptom', 'Wäsche noch nass')).caseId;
    return { s, id };
  };
  const open = (s: () => ReturnType<ReturnType<typeof createAppStore>['getState']>, id: string) =>
    Object.values(s().guideRuns).filter((r) => r.caseId === id && !r.endedAt);

  test('dieselbe Anleitung geht weiter, wo du warst', () => {
    const { s, id } = setup();
    const run = unwrap(s().startGuide(id, 'nass'));
    s().moveGuideStep(run.id, 'next');
    const again = unwrap(s().startGuide(id, 'nass'));
    expect(again.id).toBe(run.id);
    expect(s().guideRuns[run.id]).toMatchObject({ currentStep: 1, completedSteps: [0] });
    expect(s().cases[id]?.guideRunIds).toEqual([run.id]);
  });

  test('eine andere Anleitung beendet die offene, die erledigten Schritte bleiben', () => {
    const { s, id } = setup();
    const run = unwrap(s().startGuide(id, 'nass'));
    s().moveGuideStep(run.id, 'next');
    const next = unwrap(s().startGuide(id, 'tuer'));
    expect(open(s, id).map((r) => r.id)).toEqual([next.id]);
    expect(s().guideRuns[run.id]).toMatchObject({
      completedSteps: [0],
      endedAt: expect.any(String),
    });
    expect(s().guideRuns[run.id]?.outcome).toBeUndefined();
    const ended = s().events.filter((e) => e.type === 'anleitung_beendet');
    expect(ended.map((e) => e.payload)).toEqual([
      { guideRunId: run.id, guideId: 'nass', step: 2, replaced: true },
    ]);
  });

  test('openCaseFor beim Ersetzen: eine offene Anleitung bleibt nur, wenn es mit ihr weitergeht', () => {
    const { s, id } = setup();
    const run = unwrap(s().startGuide(id, 'nass'));
    expect(
      unwrap(s().openCaseFor('d-1', 'symptom', 'Wäsche noch nass', { guideId: 'nass' })).art,
    ).toBe('ersetzt');
    expect(open(s, id).map((r) => r.id)).toEqual([run.id]);
    s().openCaseFor('d-1', 'foto', 'Foto vom Display');
    expect(open(s, id)).toEqual([]);
    // Ohne erledigten Schritt ist das kein Fortschritt, der nächste Versuch ersetzt wieder
    expect(unwrap(s().openCaseFor('d-1', 'symptom', 'Tür geht nicht auf')).art).toBe('ersetzt');
  });
});

describe('startGuide mit dem Katalog der Anleitungen (Entscheidung 24)', () => {
  afterEach(() => resetCatalog());

  test('eine Anleitung, die der Katalog zur Laufzeit aufnimmt, läuft; eine unbekannte nicht', () => {
    const store = createAppStore(memoryStorage(), testEnv());
    const s = () => store.getState();
    const id = s().createCase({ deviceId: 'd-1', entry: 'symptom', problemLabel: 'Flusen' }).id;
    const guideId = 'miele-twb140/flusensieb';
    expect(s().startGuide(id, guideId)).toEqual({
      ok: false,
      refusal: { code: 'unbekannt', what: 'anleitung', id: guideId },
    });
    s().addCatalogEntry({
      id: 'miele-twb140',
      manufacturerId: 'miele',
      category: 'trockner',
      models: ['TWB 140'],
      materialNumbers: [],
      document: { title: 'Gebrauchsanweisung TWB 140 (Beispiel)', license: 'hersteller' },
      review: { status: 'freigegeben', by: 'Miele Kundendienst' },
      origin: 'import',
      guides: [
        {
          id: guideId,
          kind: 'pflege',
          title: 'Flusensieb reinigen',
          code: 'Flusen',
          sourceDocument: 'Gebrauchsanweisung TWB 140 (Beispiel)',
          steps: [{ t: 'Tür öffnen', d: 'Öffne die Tür.' }],
        },
      ],
    });
    expect(unwrap(s().startGuide(id, guideId)).guideId).toBe(guideId);
  });
});

describe('Befehle ohne Absturz: Result statt Exception', () => {
  const setup = () => {
    const store = createAppStore(memoryStorage(), testEnv());
    return { store, s: () => store.getState() };
  };
  const unknown = { code: 'unbekannt', what: 'fall', id: 'GS-99999' };

  test('eine unbekannte Fallnummer wird abgelehnt, ohne etwas zu schreiben', () => {
    const { s } = setup();
    const before = s().events.length;
    expect(s().runCommand('GS-99999', 'hilfe_holen')).toEqual({ ok: false, refusal: unknown });
    expect(s().escalate('GS-99999')).toEqual({ ok: false, refusal: unknown });
    expect(s().pauseCase('GS-99999')).toEqual({ ok: false, refusal: unknown });
    expect(s().resumeCase('GS-99999')).toEqual({ ok: false, refusal: unknown });
    expect(s().events).toHaveLength(before);
    expect(s().cases).toEqual({});
  });

  // Bis Nr. 34 war das Beispiel „abbrechen“ in der Reparatur. Jetzt ist es der erledigte Fall.
  test('ein verbotener Übergang wird abgelehnt, Fall und Akte bleiben', () => {
    const { s } = setup();
    const c = s().createCase({ deviceId: 'd-1', entry: 'foto', problemLabel: 'x' });
    unwrap(s().runCommand(c.id, 'hilfe_holen'));
    unwrap(s().runCommand(c.id, 'selbst_zahlen'));
    unwrap(s().runCommand(c.id, 'repariert'));
    const before = { case: s().cases[c.id], events: s().events.length, bookings: s().bookings };
    expect(s().runCommand(c.id, 'abbrechen', { cancelReason: 'x' })).toEqual({
      ok: false,
      refusal: { code: 'uebergang', from: 'erledigt', command: 'abbrechen' },
    });
    expect(s().cases[c.id]).toBe(before.case);
    expect(s().events).toHaveLength(before.events);
    expect(s().bookings).toBe(before.bookings);
  });

  test('Hilfe holen gibt den neuen Stand zurück, ein zweites Mal wird abgelehnt', () => {
    const { s } = setup();
    const c = s().createCase({ deviceId: 'd-1', entry: 'foto', problemLabel: 'x' });
    expect(unwrap(s().escalate(c.id)).status).toBe('eskaliert');
    expect(s().escalate(c.id)).toEqual({
      ok: false,
      refusal: { code: 'uebergang', from: 'eskaliert', command: 'hilfe_holen' },
    });
  });

  test('ein abgeschlossener Fall lässt sich nicht pausieren', () => {
    const { s } = setup();
    const c = s().createCase({ deviceId: 'd-1', entry: 'foto', problemLabel: 'x' });
    expect(unwrap(s().pauseCase(c.id)).pausedAt).toBeDefined();
    unwrap(s().runCommand(c.id, 'abbrechen', { cancelReason: 'x' }));
    const events = s().events.length;
    expect(s().pauseCase(c.id)).toEqual({
      ok: false,
      refusal: { code: 'regel', action: 'pausieren' },
    });
    expect(s().events).toHaveLength(events);
  });
});

describe('Schadenfall und Termin: erst prüfen, dann in einem Schritt schreiben', () => {
  const partner = demoConfig.partners[1]!;
  /** Fall mit Schutz und Kostenvoranschlag, bereit für die Meldung */
  const setup = (contract = true) => {
    const store = createAppStore(memoryStorage(), testEnv());
    const s = () => store.getState();
    s().ensureHousehold();
    if (contract) s().linkContract('vertragsnummer');
    const device = s().addDevice({
      category: 'waschmaschine',
      manufacturerId: demoConfig.manufacturer.id,
      model: demoConfig.device.model,
      contractId: s().contracts[0]?.id,
      identifiedBy: 'manuell',
    });
    const c = s().createCase({ deviceId: device.id, entry: 'foto', problemLabel: 'x' });
    unwrap(s().escalate(c.id));
    s().setFinding(c.id, 'reparatur', 'fachkraft');
    /** Zählt, wie oft der Store sich ändert */
    let writes = 0;
    store.subscribe(() => {
      writes += 1;
    });
    return { s, id: c.id, writes: () => writes };
  };

  test('die Meldung schreibt Bestätigung, Meldung und Status auf einmal', () => {
    const { s, id, writes } = setup();
    const reported = unwrap(s().reportClaim(id));
    expect(reported.status).toBe('freigabe_noetig');
    expect(writes()).toBe(1);
    const consent = s().consents.find((c) => c.purpose === 'weitergabe_versicherer');
    expect(reported.claim?.confirmationId).toBe(consent?.id);
    expect(
      selectCaseEvents(s(), id)
        .slice(-3)
        .map((e) => e.type),
    ).toEqual(['weitergabe_bestaetigt', 'schaden_gemeldet', 'status_geaendert']);
  });

  test('ein zweites Melden wird abgelehnt, ohne zweite Bestätigung', () => {
    const { s, id, writes } = setup();
    unwrap(s().reportClaim(id));
    expect(s().reportClaim(id)).toEqual({
      ok: false,
      refusal: { code: 'regel', action: 'schaden_melden' },
    });
    expect(writes()).toBe(1);
    expect(s().consents.filter((c) => c.purpose === 'weitergabe_versicherer')).toHaveLength(1);
  });

  test('ohne Schutz und ohne Fall keine Meldung', () => {
    const without = setup(false);
    expect(without.s().reportClaim(without.id)).toEqual({
      ok: false,
      refusal: { code: 'vertrag' },
    });
    expect(without.s().reportClaim('GS-99999')).toEqual({
      ok: false,
      refusal: { code: 'unbekannt', what: 'fall', id: 'GS-99999' },
    });
    expect(without.writes()).toBe(0);
  });

  // Selbstzahler buchen mit bekanntem Preis gleich verbindlich. Seit Entscheidung Nr. 31 hält
  // dasselbe set den Tap „Zahlungspflichtig buchen“ mit Betrag und Text in der Fallakte fest.
  test('selbst zahlen: Status, Bestätigung, Termin, verbindliche Buchung und Ereignisse auf einmal', () => {
    const { s, id, writes } = setup(false);
    const booking = unwrap(
      s().requestBooking({
        caseId: id,
        kind: 'reparatur',
        partnerId: partner.id,
        slotLabel: demoConfig.slots[0]!,
        selfPay: true,
      }),
    );
    expect(writes()).toBe(1);
    expect(s().cases[id]).toMatchObject({ status: 'in_reparatur', bookingId: booking.id });
    expect(booking).toMatchObject({
      provider: { id: partner.id },
      subjectToApproval: false,
      binding: { amount: 18900 },
    });
    const events = selectCaseEvents(s(), id).slice(-4);
    expect(events.map((e) => e.type)).toEqual([
      'status_geaendert',
      'weitergabe_bestaetigt',
      'termin_angefragt',
      'zahlungspflichtig_gebucht',
    ]);
    expect(events[3]!.payload).toEqual({
      bookingId: booking.id,
      kind: 'reparatur',
      partner: partner.name,
      slot: demoConfig.slots[0],
      amount: 18900,
      reason: 'preis',
      separateStep: false,
      ...textStamp('verbindliche_buchung', { ...demoNames(), fachbetrieb: partner.name }),
    });
  });

  test('unbekannter Betrieb, unbekannter Fall und die Pumpe werden abgelehnt', () => {
    const { s, id, writes } = setup();
    const input = {
      caseId: id,
      kind: 'reparatur' as const,
      partnerId: partner.id,
      slotLabel: demoConfig.slots[0]!,
      selfPay: false,
    };
    expect(s().requestBooking({ ...input, partnerId: 'niemand' })).toEqual({
      ok: false,
      refusal: { code: 'unbekannt', what: 'betrieb', id: 'niemand' },
    });
    expect(s().requestBooking({ ...input, caseId: 'GS-99999' })).toEqual({
      ok: false,
      refusal: { code: 'unbekannt', what: 'fall', id: 'GS-99999' },
    });
    const pump = de.appliance.waschmaschine.finding.component;
    expect(s().requestBooking({ ...input, kind: 'ersatzteil_versand', partName: pump })).toEqual({
      ok: false,
      refusal: { code: 'nur_betrieb', part: pump },
    });
    expect(writes()).toBe(0);
    expect(s().bookings).toEqual([]);
  });
});

describe('Termin-Regeln im Store (model/policies/bookingRules.ts)', () => {
  const partner = demoConfig.partners[1]!;
  /** Fall mit Kostenvoranschlag, mit oder ohne Schutz. Ablehnung, wenn gewünscht. */
  const setup = (contract = true, claimScenario: 'freigeben' | 'ablehnen' = 'freigeben') => {
    const store = createAppStore(memoryStorage(), testEnv());
    const s = () => store.getState();
    s().ensureHousehold();
    s().setDemo({ claimScenario });
    if (contract) s().linkContract('vertragsnummer');
    const device = s().addDevice({
      category: 'waschmaschine',
      manufacturerId: demoConfig.manufacturer.id,
      model: demoConfig.device.model,
      contractId: s().contracts[0]?.id,
      identifiedBy: 'manuell',
    });
    const c = s().createCase({ deviceId: device.id, entry: 'foto', problemLabel: 'x' });
    unwrap(s().escalate(c.id));
    unwrap(s().setFinding(c.id, 'reparatur', 'fachkraft'));
    const input = {
      caseId: c.id,
      kind: 'reparatur' as const,
      partnerId: partner.id,
      slotLabel: demoConfig.slots[0]!,
      selfPay: !contract,
    };
    return { store, s, id: c.id, input };
  };

  test('ein bestätigter Termin: kein zweiter derselben Art, der Store bleibt, wie er ist (R-08)', () => {
    const { store, s, id, input } = setup(false);
    const first = unwrap(s().requestBooking(input));
    expect(s().simulateNext(id)).toBe(true);
    expect(s().bookings.find((b) => b.id === first.id)?.status).toBe('bestaetigt');
    const before = store.getState();
    expect(s().requestBooking({ ...input, slotLabel: demoConfig.slots[1]! })).toEqual({
      ok: false,
      refusal: { code: 'termin_laeuft', kind: 'reparatur' },
    });
    expect(store.getState()).toBe(before);
    expect(s().bookings.filter((b) => b.status !== 'storniert')).toHaveLength(1);
  });

  test('auch ein nur angefragter Termin läuft: kein zweiter daneben', () => {
    const { s, input } = setup(false);
    unwrap(s().requestBooking(input));
    expect(s().requestBooking(input)).toEqual({
      ok: false,
      refusal: { code: 'termin_laeuft', kind: 'reparatur' },
    });
    expect(s().bookings).toHaveLength(1);
  });

  test('nach der Ablehnung kein Termin auf Kosten des Versicherers (R-09)', () => {
    const { store, s, id, input } = setup(true, 'ablehnen');
    unwrap(s().reportClaim(id));
    expect(s().simulateNext(id)).toBe(true);
    expect(s().cases[id]?.status).toBe('abgelehnt');
    const before = store.getState();
    expect(s().requestBooking(input)).toEqual({
      ok: false,
      refusal: { code: 'regel', action: 'termin_versicherer' },
    });
    expect(store.getState()).toBe(before);
  });

  test('während der Prüfung kein Selbstzahler-Termin, nur vorbehaltlich Freigabe (R-07)', () => {
    const { s, id, input } = setup(true);
    unwrap(s().reportClaim(id));
    expect(s().requestBooking({ ...input, selfPay: true })).toEqual({
      ok: false,
      refusal: { code: 'regel', action: 'termin_selbst' },
    });
    const booking = unwrap(s().requestBooking(input));
    expect(booking.subjectToApproval).toBe(true);
    expect(s().cases[id]?.status).toBe('freigabe_noetig');
  });

  test('umbuchen nach der Ablehnung: der verfallene Termin wird storniert, ein neuer angelegt', () => {
    const { s, id, input } = setup(true, 'ablehnen');
    unwrap(s().reportClaim(id));
    const lapsed = unwrap(s().requestBooking(input));
    expect(s().simulateNext(id)).toBe(true);
    expect(s().cases[id]?.status).toBe('abgelehnt');
    const rebooked = unwrap(
      s().requestBooking({ ...input, selfPay: true, slotLabel: demoConfig.slots[1]! }),
    );
    expect(s().bookings.find((b) => b.id === lapsed.id)?.status).toBe('storniert');
    expect(s().bookings.filter((b) => b.status !== 'storniert')).toEqual([rebooked]);
    expect(rebooked).toMatchObject({ subjectToApproval: false, slotLabel: demoConfig.slots[1] });
    expect(s().cases[id]).toMatchObject({ status: 'in_reparatur', bookingId: rebooked.id });
  });
});

describe('Zahlungspflichtig buchen erst nach der Freigabe (Entscheidung Nr. 31)', () => {
  const partner = demoConfig.partners[1]!;
  /** Gemeldet, Termin vorbehaltlich Freigabe angefragt, mit Selbstbeteiligung */
  const setup = (
    deductible: number,
    claimScenario: 'freigeben' | 'ablehnen' = 'freigeben',
    request = true,
  ) => {
    const store = createAppStore(memoryStorage(), testEnv());
    const s = () => store.getState();
    s().ensureHousehold();
    s().setDemo({ claimScenario, deductible });
    s().linkContract('vertragsnummer');
    const device = s().addDevice({
      category: 'waschmaschine',
      manufacturerId: demoConfig.manufacturer.id,
      model: demoConfig.device.model,
      contractId: s().contracts[0]?.id,
      identifiedBy: 'vertrag',
    });
    const id = s().createCase({ deviceId: device.id, entry: 'foto', problemLabel: 'x' }).id;
    unwrap(s().escalate(id));
    unwrap(s().setFinding(id, 'reparatur', 'fachkraft'));
    unwrap(s().reportClaim(id));
    const input = {
      caseId: id,
      kind: 'reparatur' as const,
      partnerId: partner.id,
      slotLabel: demoConfig.slots[2]!,
      selfPay: false,
    };
    const booking = request ? unwrap(s().requestBooking(input)) : undefined;
    return { store, s, id, input, booking };
  };
  const taps = (s: () => ReturnType<ReturnType<typeof createAppStore>['getState']>, id: string) =>
    selectCaseEvents(s(), id).filter((e) => e.type === 'zahlungspflichtig_gebucht');

  test.each([0, 5000])(
    'während der Prüfung mit %i Cent: unverbindliche Anfrage, kein Betrag, kein Tap',
    (deductible) => {
      const { store, s, id, booking } = setup(deductible);
      expect(booking).toMatchObject({ status: 'angefragt', subjectToApproval: true });
      expect(booking!.binding).toBeUndefined();
      expect(taps(s, id)).toEqual([]);
      const f = selectCaseFacts(s(), id)!;
      expect(f.bindingDue).toBeUndefined();
      expect(can(f, 'zahlungspflichtig_buchen')).toBe(false);
      const before = store.getState();
      expect(s().bookBinding(id, deductible)).toEqual({
        ok: false,
        refusal: { code: 'regel', action: 'zahlungspflichtig_buchen' },
      });
      expect(store.getState()).toBe(before);
    },
  );

  test('nach der Freigabe wartet der Termin auf den Tap, die Simulation überspringt ihn nie', () => {
    const { s, id, booking } = setup(5000);
    expect(s().simulateNext(id)).toBe(true);
    expect(s().cases[id]?.status).toBe('freigegeben');
    const f = selectCaseFacts(s(), id)!;
    expect(f.bindingDue).toEqual({
      booking: expect.objectContaining({ id: booking!.id }),
      amount: 5000,
      reason: 'selbstbeteiligung',
    });
    expect(availableActions(f)).toContain('zahlungspflichtig_buchen');
    expect(nextSimulationDue(s(), id)).toBeUndefined();
    for (let i = 0; i < 5; i++) expect(s().simulateNext(id)).toBe(false);
    expect(s().cases[id]?.status).toBe('freigegeben');
    expect(s().bookings.find((b) => b.id === booking!.id)?.status).toBe('angefragt');
    expect(selectCaseEvents(s(), id).some((e) => e.type === 'termin_bestaetigt')).toBe(false);
  });

  test('der Tap bucht verbindlich, mit Betrag und Text in der Fallakte, dann bestätigt der Betrieb', () => {
    const { store, s, id, booking } = setup(5000);
    s().simulateNext(id);
    let writes = 0;
    const off = store.subscribe(() => {
      writes += 1;
    });
    const bound = unwrap(s().bookBinding(id, 5000));
    off();
    expect(writes).toBe(1);
    expect(bound).toMatchObject({
      id: booking!.id,
      status: 'angefragt',
      binding: { amount: 5000 },
    });
    const [tap] = taps(s, id);
    expect(tap).toMatchObject({ actor: { kind: 'haushalt' } });
    expect(tap!.payload).toEqual({
      bookingId: booking!.id,
      kind: 'reparatur',
      partner: partner.name,
      slot: demoConfig.slots[2],
      amount: 5000,
      reason: 'selbstbeteiligung',
      separateStep: true,
      ...textStamp('verbindliche_buchung', { ...demoNames(), fachbetrieb: partner.name }),
    });
    expect(selectCaseFacts(s(), id)!.bindingDue).toBeUndefined();
    expect(nextSimulationDue(s(), id)).toBeDefined();
    // Ein zweiter Tap bucht nicht noch einmal
    expect(s().bookBinding(id, 5000)).toEqual({
      ok: false,
      refusal: { code: 'regel', action: 'zahlungspflichtig_buchen' },
    });
    expect(s().simulateNext(id)).toBe(true);
    expect(s().cases[id]?.status).toBe('in_reparatur');
    expect(s().bookings.find((b) => b.id === booking!.id)?.status).toBe('bestaetigt');
  });

  test('ein anderer Betrag als der gezeigte wird nicht gebucht', () => {
    const { store, s, id } = setup(5000);
    s().simulateNext(id);
    const before = store.getState();
    expect(s().bookBinding(id, 0)).toEqual({
      ok: false,
      refusal: { code: 'betrag', shown: 0, due: 5000 },
    });
    expect(store.getState()).toBe(before);
  });

  test('ohne gültige Weitergabe an den Betrieb kein Tap, nach dem erneuten Bestätigen schon', () => {
    const { store, s, id } = setup(5000);
    s().simulateNext(id);
    const share = s().consents.find((c) => c.purpose === 'weitergabe_betrieb' && !c.revokedAt)!;
    s().revokeConsent(share.id);
    expect(can(selectCaseFacts(s(), id), 'zahlungspflichtig_buchen')).toBe(false);
    const before = store.getState();
    expect(s().bookBinding(id, 5000)).toEqual({
      ok: false,
      refusal: { code: 'bestaetigung', purpose: 'weitergabe_betrieb' },
    });
    expect(store.getState()).toBe(before);
    unwrap(s().renewTransfer(id));
    expect(unwrap(s().bookBinding(id, 5000)).binding?.amount).toBe(5000);
  });

  test('mit 0 € gibt es keinen zweiten Schritt: Der Betrieb bestätigt nach der Freigabe', () => {
    const { s, id, booking } = setup(0);
    s().simulateNext(id);
    expect(s().cases[id]?.status).toBe('freigegeben');
    expect(selectCaseFacts(s(), id)!.bindingDue).toBeUndefined();
    expect(s().simulateNext(id)).toBe(true);
    expect(s().cases[id]?.status).toBe('in_reparatur');
    expect(s().bookings.find((b) => b.id === booking!.id)?.binding).toBeUndefined();
    expect(taps(s, id)).toEqual([]);
  });

  test('erst nach der Freigabe gebucht: verbindlich mit dem Tap beim Termin, kein zweiter Schritt', () => {
    const { s, id, input } = setup(5000, 'freigeben', false);
    s().simulateNext(id);
    const booking = unwrap(s().requestBooking(input));
    expect(booking).toMatchObject({ subjectToApproval: false, binding: { amount: 5000 } });
    expect(taps(s, id).map((e) => e.payload)).toEqual([
      expect.objectContaining({ amount: 5000, reason: 'selbstbeteiligung', separateStep: false }),
    ]);
    expect(selectCaseFacts(s(), id)!.bindingDue).toBeUndefined();
    expect(s().simulateNext(id)).toBe(true);
    expect(s().cases[id]?.status).toBe('in_reparatur');
  });

  test('lehnt Kranich ab, wird die Anfrage nie zur Buchung, selbst zahlen bindet mit dem Preis', () => {
    const { s, id, booking, input } = setup(5000, 'ablehnen');
    expect(s().simulateNext(id)).toBe(true);
    expect(s().cases[id]?.status).toBe('abgelehnt');
    expect(selectCaseFacts(s(), id)!.bindingDue).toBeUndefined();
    expect(s().bookBinding(id, 5000).ok).toBe(false);
    expect(s().simulateNext(id)).toBe(false);
    const lapsed = s().bookings.find((b) => b.id === booking!.id)!;
    expect(lapsed.binding).toBeUndefined();
    expect(lapsed.status).toBe('angefragt');
    const own = unwrap(s().requestBooking({ ...input, selfPay: true }));
    expect(own.binding?.amount).toBe(18900);
    expect(taps(s, id).map((e) => e.payload.bookingId)).toEqual([own.id]);
    expect(s().bookings.find((b) => b.id === booking!.id)?.status).toBe('storniert');
  });
});

describe('Vor-Ort-Diagnose: erst der Preis, dann verbindlich oder nicht (Entscheidung Nr. 33)', () => {
  const partner = demoConfig.partners[1]!;
  const price = demoConfig.prices.diagnosis;
  /** Nach „Hilfe holen“, ohne Schutz, Vor-Ort-Diagnose angefragt */
  const setup = () => {
    const store = createAppStore(memoryStorage(), testEnv());
    const s = () => store.getState();
    s().ensureHousehold();
    const device = s().addDevice({
      category: 'waschmaschine',
      manufacturerId: demoConfig.manufacturer.id,
      model: demoConfig.device.model,
      identifiedBy: 'manuell',
    });
    const id = s().createCase({ deviceId: device.id, entry: 'symptom', problemLabel: 'x' }).id;
    unwrap(s().escalate(id));
    const options = availableActions(selectCaseFacts(s(), id));
    const booking = unwrap(
      s().requestBooking({
        caseId: id,
        kind: 'vor_ort_diagnose',
        partnerId: partner.id,
        slotLabel: demoConfig.slots[2]!,
        selfPay: false,
      }),
    );
    return { store, s, id, booking, options };
  };
  const bookingIn = (s: ReturnType<typeof setup>['s'], id: string) =>
    s().bookings.find((b) => b.id === id)!;

  test('der Preis ist ein Beispielwert aus der Konfiguration, über 0 €', () => {
    expect(price).toBeGreaterThan(0);
    expect(demoConfig.isExample).toBe(true);
  });

  test('die Anfrage ist unverbindlich: kein Preis, kein Betrag, kein Tap', () => {
    const { s, id, booking } = setup();
    expect(booking.price).toBeUndefined();
    expect(booking.binding).toBeUndefined();
    expect(selectCaseFacts(s(), id)!.bindingDue).toBeUndefined();
    expect(s().bookBinding(id, price).ok).toBe(false);
  });

  test('der Betrieb nennt den Preis vor dem Termin, dann wartet die Simulation auf dich', () => {
    const { s, id, booking } = setup();
    expect(s().simulateNext(id)).toBe(true);
    expect(bookingIn(s, booking.id)).toMatchObject({ status: 'angefragt', price });
    const named = selectCaseEvents(s(), id).find((e) => e.type === 'preis_genannt')!;
    expect(named).toMatchObject({
      actor: { kind: 'betrieb', id: partner.id, name: partner.name },
      payload: { bookingId: booking.id, partner: partner.name, price },
    });
    const f = selectCaseFacts(s(), id)!;
    expect(f.bindingDue).toEqual({
      booking: expect.objectContaining({ id: booking.id }),
      amount: price,
      reason: 'preis',
    });
    expect(availableActions(f)).toEqual(
      expect.arrayContaining(['zahlungspflichtig_buchen', 'nicht_buchen']),
    );
    expect(nextSimulationDue(s(), id)).toBeUndefined();
    for (let i = 0; i < 5; i++) expect(s().simulateNext(id)).toBe(false);
    expect(bookingIn(s, booking.id).status).toBe('angefragt');
    expect(selectCaseEvents(s(), id).some((e) => e.type === 'termin_bestaetigt')).toBe(false);
  });

  test('„Zahlungspflichtig buchen“ mit dem Preis, dann bestätigt der Betrieb und kommt', () => {
    const { s, id, booking } = setup();
    s().simulateNext(id);
    const bound = unwrap(s().bookBinding(id, price));
    expect(bound.binding?.amount).toBe(price);
    expect(
      selectCaseEvents(s(), id).find((e) => e.type === 'zahlungspflichtig_gebucht')?.payload,
    ).toEqual({
      bookingId: booking.id,
      kind: 'vor_ort_diagnose',
      partner: partner.name,
      slot: demoConfig.slots[2],
      amount: price,
      reason: 'preis',
      separateStep: true,
      ...textStamp('verbindliche_buchung', { ...demoNames(), fachbetrieb: partner.name }),
    });
    while (s().simulateNext(id));
    expect(bookingIn(s, booking.id).status).toBe('erledigt');
    expect(s().cases[id]?.quoteId).toBeDefined();
  });

  test('„Nicht buchen“: Anfrage storniert, keine Kosten, der Fall bietet, was er vorher bot', () => {
    const { store, s, id, booking, options } = setup();
    s().simulateNext(id);
    let writes = 0;
    const off = store.subscribe(() => {
      writes += 1;
    });
    const declined = unwrap(s().declineBinding(id));
    off();
    expect(writes).toBe(1);
    expect(declined).toMatchObject({ id: booking.id, status: 'storniert' });
    expect(bookingIn(s, booking.id).binding).toBeUndefined();
    const events = selectCaseEvents(s(), id);
    expect(events.some((e) => e.type === 'zahlungspflichtig_gebucht')).toBe(false);
    expect(events.at(-1)).toMatchObject({
      type: 'nicht_gebucht',
      actor: { kind: 'haushalt' },
      payload: { bookingId: booking.id, amount: price, reason: 'preis' },
    });
    const f = selectCaseFacts(s(), id)!;
    expect(f.status).toBe('eskaliert');
    expect(f.bindingDue).toBeUndefined();
    expect(availableActions(f)).toEqual(options);
    expect(options).toContain('termin_diagnose');
    expect(s().simulateNext(id)).toBe(false);
    // Kein zweites „Nicht buchen“ und kein Tap mehr
    expect(s().declineBinding(id)).toEqual({
      ok: false,
      refusal: { code: 'regel', action: 'nicht_buchen' },
    });
    expect(s().bookBinding(id, price).ok).toBe(false);
  });

  test('ohne wartenden Termin wird „Nicht buchen“ abgelehnt, ohne etwas zu schreiben', () => {
    const { store, s, id } = setup();
    const before = store.getState();
    expect(s().declineBinding(id)).toEqual({
      ok: false,
      refusal: { code: 'regel', action: 'nicht_buchen' },
    });
    expect(store.getState()).toBe(before);
    expect(s().declineBinding('GS-99999')).toEqual({
      ok: false,
      refusal: { code: 'unbekannt', what: 'fall', id: 'GS-99999' },
    });
  });

  test('derselbe Weg nach der Freigabe (Nr. 31): „Nicht buchen“, dann neu und gleich verbindlich', () => {
    const store = createAppStore(memoryStorage(), testEnv());
    const s = () => store.getState();
    s().ensureHousehold();
    s().setDemo({ deductible: 5000 });
    s().linkContract('vertragsnummer');
    const device = s().addDevice({
      category: 'waschmaschine',
      manufacturerId: demoConfig.manufacturer.id,
      model: demoConfig.device.model,
      contractId: s().contracts[0]?.id,
      identifiedBy: 'vertrag',
    });
    const id = s().createCase({ deviceId: device.id, entry: 'foto', problemLabel: 'x' }).id;
    unwrap(s().escalate(id));
    unwrap(s().setFinding(id, 'reparatur', 'fachkraft'));
    unwrap(s().reportClaim(id));
    const input = {
      caseId: id,
      kind: 'reparatur' as const,
      partnerId: partner.id,
      slotLabel: demoConfig.slots[0]!,
      selfPay: false,
    };
    const first = unwrap(s().requestBooking(input));
    s().simulateNext(id);
    unwrap(s().declineBinding(id));
    expect(s().cases[id]?.status).toBe('freigegeben');
    expect(bookingIn(s, first.id)).toMatchObject({ status: 'storniert' });
    expect(can(selectCaseFacts(s(), id), 'termin_versicherer')).toBe(true);
    const second = unwrap(s().requestBooking({ ...input, slotLabel: demoConfig.slots[1]! }));
    expect(second).toMatchObject({ subjectToApproval: false, binding: { amount: 5000 } });
  });
});

describe('Neustart mit wartendem und gebuchtem Termin (Nr. 31, Nr. 33)', () => {
  test('Preis, verbindliche Buchung und Ereignisse überstehen den Neustart, die Formprüfung behält sie', async () => {
    const storage = memoryStorage();
    const first = createAppStore(storage, testEnv());
    await first.persist.rehydrate();
    const s = () => first.getState();
    s().ensureHousehold();
    const device = s().addDevice({
      category: 'waschmaschine',
      manufacturerId: demoConfig.manufacturer.id,
      model: demoConfig.device.model,
      identifiedBy: 'manuell',
    });
    const id = s().createCase({ deviceId: device.id, entry: 'symptom', problemLabel: 'x' }).id;
    unwrap(s().escalate(id));
    const booking = unwrap(
      s().requestBooking({
        caseId: id,
        kind: 'vor_ort_diagnose',
        partnerId: demoConfig.partners[0]!.id,
        slotLabel: demoConfig.slots[0]!,
        selfPay: false,
      }),
    );
    s().simulateNext(id);

    // Neustart vor dem Tap: Der Preis ist da, der Termin wartet weiter
    const second = createAppStore(storage, testEnv());
    await second.persist.rehydrate();
    const restored = second.getState().bookings.find((b) => b.id === booking.id);
    expect(restored?.price).toBe(demoConfig.prices.diagnosis);
    expect(selectCaseFacts(second.getState(), id)?.bindingDue?.amount).toBe(
      demoConfig.prices.diagnosis,
    );
    expect(second.getState().simulateNext(id)).toBe(false);

    // Neustart nach dem Tap: binding und Ereignis bleiben, der Betrieb bestätigt
    unwrap(second.getState().bookBinding(id, demoConfig.prices.diagnosis));
    const third = createAppStore(storage, testEnv());
    await third.persist.rehydrate();
    expect(third.getState().bookings.find((b) => b.id === booking.id)?.binding?.amount).toBe(
      demoConfig.prices.diagnosis,
    );
    expect(selectCaseEvents(third.getState(), id).map((e) => e.type)).toEqual(
      expect.arrayContaining(['preis_genannt', 'zahlungspflichtig_gebucht']),
    );
    expect(selectCaseFacts(third.getState(), id)?.bindingDue).toBeUndefined();
    expect(third.getState().simulateNext(id)).toBe(true);
  });
});

describe('Befund vor Ort (R-10)', () => {
  const setup = () => {
    const store = createAppStore(memoryStorage(), testEnv());
    const s = () => store.getState();
    s().ensureHousehold();
    const device = s().addDevice({
      category: 'waschmaschine',
      manufacturerId: demoConfig.manufacturer.id,
      model: demoConfig.device.model,
      identifiedBy: 'manuell',
    });
    const c = s().createCase({ deviceId: device.id, entry: 'symptom', problemLabel: 'x' });
    unwrap(s().escalate(c.id));
    return { store, s, id: c.id };
  };

  test('ohne Termin zur Vor-Ort-Diagnose schreibt kein Betrieb einen Befund', () => {
    const { store, s, id } = setup();
    const before = store.getState();
    expect(s().setFinding(id, 'reparatur', 'betrieb')).toEqual({
      ok: false,
      refusal: { code: 'unbekannt', what: 'termin', id },
    });
    expect(store.getState()).toBe(before);
  });

  test('der gebuchte Betrieb schreibt Befund und Kostenvoranschlag, mit seiner Nummer', () => {
    const { s, id } = setup();
    const partner = demoConfig.partners[1]!;
    unwrap(
      s().requestBooking({
        caseId: id,
        kind: 'vor_ort_diagnose',
        partnerId: partner.id,
        slotLabel: demoConfig.slots[2]!,
        selfPay: false,
      }),
    );
    // Seit Entscheidung Nr. 33 nennt der Betrieb erst den Preis, dann wartet die Simulation auf
    // „Zahlungspflichtig buchen“. Vorher lief sie ohne Tap bis zum Befund.
    while (s().simulateNext(id));
    expect(selectCaseEvents(s(), id).some((e) => e.type === 'befund_erstellt')).toBe(false);
    unwrap(s().bookBinding(id, demoConfig.prices.diagnosis));
    while (s().simulateNext(id));
    const events = selectCaseEvents(s(), id);
    expect(events.find((e) => e.type === 'preis_genannt')?.actor).toEqual({
      kind: 'betrieb',
      id: partner.id,
      name: partner.name,
    });
    for (const type of ['befund_erstellt', 'angebot_erstellt'] as const) {
      expect(events.find((e) => e.type === type)?.actor).toEqual({
        kind: 'betrieb',
        id: partner.id,
        name: partner.name,
      });
    }
    const quote = s().quotes.find((q) => q.id === s().cases[id]?.quoteId);
    expect(quote?.createdBy).toEqual({ kind: 'betrieb', name: partner.name });
    expect(s().diagnoses.at(-1)?.source).toBe('betrieb');
  });
});

describe('Videocall und Rückruf: Bestätigung und Anfrage in einem Schritt', () => {
  const partner = demoConfig.partners[0]!;
  const share = (caseId: string) => ({
    caseId,
    purpose: 'weitergabe_fachkraft' as const,
    legalBasis: 'vertrag' as const,
    recipient: { id: partner.id, kind: 'betrieb' as const, name: partner.name },
    dataCategories: ['Fotos'],
    textVersion: '1',
  });
  const setup = () => {
    const store = createAppStore(memoryStorage(), testEnv());
    const s = () => store.getState();
    s().ensureHousehold();
    const c = s().createCase({ deviceId: 'd-1', entry: 'foto', problemLabel: 'x' });
    let writes = 0;
    store.subscribe(() => {
      writes += 1;
    });
    return { s, id: c.id, writes: () => writes };
  };

  test('vor „Hilfe holen“ kein Call, nichts wird gespeichert', () => {
    const { s, id, writes } = setup();
    expect(s().requestVideoCall(id, { share: share(id) })).toEqual({
      ok: false,
      refusal: { code: 'regel', action: 'videocall_anfragen' },
    });
    expect(writes()).toBe(0);
  });

  test('ohne Bestätigung kein Call, auch die Einwilligung in Screenshots bleibt ungespeichert', () => {
    const { s, id, writes } = setup();
    unwrap(s().escalate(id));
    const screenshots = { ...share(id), purpose: 'screenshots_im_call' as const };
    expect(s().requestVideoCall(id, { screenshots })).toEqual({
      ok: false,
      refusal: { code: 'bestaetigung', purpose: 'weitergabe_fachkraft' },
    });
    expect(writes()).toBe(1);
    expect(s().consents).toEqual([]);
  });

  test('mit dem Tap: Bestätigungen, Call und Ereignisse auf einmal', () => {
    const { s, id, writes } = setup();
    unwrap(s().escalate(id));
    const screenshots = { ...share(id), purpose: 'screenshots_im_call' as const };
    const session = unwrap(s().requestVideoCall(id, { share: share(id), screenshots }));
    expect(writes()).toBe(2);
    expect(s().consents.map((c) => c.purpose)).toEqual([
      'weitergabe_fachkraft',
      'screenshots_im_call',
    ]);
    expect(session.screenshotsConsentId).toBe(s().consents[1]?.id);
    expect(unwrap(s().updateVideoCall(session.id, 'verbunden')).outcome).toBe('verbunden');
    expect(s().updateVideoCall('video-x', 'beendet')).toEqual({
      ok: false,
      refusal: { code: 'unbekannt', what: 'videocall', id: 'video-x' },
    });
  });

  test('Rückruf: Bestätigung und Anfrage auf einmal, vor „Hilfe holen“ keiner', () => {
    const { s, id, writes } = setup();
    expect(s().requestCallback(id, 'heute', share(id))).toEqual({
      ok: false,
      refusal: { code: 'regel', action: 'rueckruf_anfragen' },
    });
    expect(s().consents).toEqual([]);
    unwrap(s().escalate(id));
    expect(s().requestCallback(id, 'heute', share(id))).toEqual({ ok: true, value: undefined });
    expect(writes()).toBe(2);
    expect(
      selectCaseEvents(s(), id)
        .slice(-2)
        .map((e) => e.type),
    ).toEqual(['weitergabe_bestaetigt', 'videocall_angefragt']);
  });
});

describe('Anleitung, Befund und Abschluss: Result und ein Schritt', () => {
  const setup = () => {
    const store = createAppStore(memoryStorage(), testEnv());
    const s = () => store.getState();
    s().ensureHousehold();
    const c = s().createCase({ deviceId: 'd-1', entry: 'foto', problemLabel: 'x' });
    let writes = 0;
    store.subscribe(() => {
      writes += 1;
    });
    return { s, id: c.id, writes: () => writes };
  };

  test('eine Anleitung starten: Status, Anleitung und Ereignisse auf einmal', () => {
    const { s, id, writes } = setup();
    const run = unwrap(s().startGuide(id, 'ablauf'));
    expect(writes()).toBe(1);
    expect(s().cases[id]).toMatchObject({ status: 'selbsthilfe', guideRunIds: [run.id] });
    expect(
      selectCaseEvents(s(), id).find((e) => e.type === 'anleitung_gestartet')?.payload,
    ).toEqual({ guideId: 'ablauf', guideRunId: run.id });
  });

  test('unbekannte Anleitung, unbekannter Fall und „eskaliert“ werden abgelehnt', () => {
    const { s, id, writes } = setup();
    expect(s().startGuide(id, 'gibt-es-nicht')).toEqual({
      ok: false,
      refusal: { code: 'unbekannt', what: 'anleitung', id: 'gibt-es-nicht' },
    });
    expect(s().startGuide('GS-99999', 'ablauf')).toEqual({
      ok: false,
      refusal: { code: 'unbekannt', what: 'fall', id: 'GS-99999' },
    });
    expect(writes()).toBe(0);
    unwrap(s().escalate(id));
    expect(s().startGuide(id, 'ablauf')).toEqual({
      ok: false,
      refusal: { code: 'regel', action: 'anleitung_starten' },
    });
    expect(s().guideRuns).toEqual({});
  });

  test('„Geht nicht“ beendet die Anleitung und holt Hilfe in einem Schritt, nur einmal', () => {
    const { s, id, writes } = setup();
    const run = unwrap(s().startGuide(id, 'ablauf'));
    const ended = unwrap(s().finishGuide(run.id, 'geht_nicht', 'klemmt'));
    expect(writes()).toBe(2);
    expect(ended).toMatchObject({ outcome: 'geht_nicht', abortNote: 'klemmt' });
    expect(s().cases[id]?.status).toBe('eskaliert');
    expect(s().finishGuide(run.id, 'fertig')).toEqual({
      ok: false,
      refusal: { code: 'regel', action: 'anleitung_fortsetzen' },
    });
    expect(s().finishGuide('anleitung-x', 'fertig')).toEqual({
      ok: false,
      refusal: { code: 'unbekannt', what: 'anleitung', id: 'anleitung-x' },
    });
    expect(writes()).toBe(2);
  });

  test('der Befund schreibt Ergebnis, Kostenvoranschlag und Ereignisse auf einmal', () => {
    const { s, id, writes } = setup();
    unwrap(s().escalate(id));
    const after = unwrap(s().setFinding(id, 'reparatur', 'fachkraft'));
    expect(writes()).toBe(2);
    expect(after.quoteId).toBe(s().quotes[0]?.id);
    expect(after.diagnosisIds).toEqual([s().diagnoses[0]?.id]);
    expect(
      selectCaseEvents(s(), id)
        .slice(-2)
        .map((e) => e.type),
    ).toEqual(['befund_erstellt', 'angebot_erstellt']);
    expect(s().setFinding('GS-99999', 'geloest', 'fachkraft')).toEqual({
      ok: false,
      refusal: { code: 'unbekannt', what: 'fall', id: 'GS-99999' },
    });
  });

  test('im Call gelöst: Befund und „erledigt“ auf einmal', () => {
    const { s, id, writes } = setup();
    unwrap(s().escalate(id));
    expect(unwrap(s().setFinding(id, 'geloest', 'fachkraft')).status).toBe('erledigt');
    expect(writes()).toBe(2);
  });

  test('„Läuft wieder“ nur nach der Reparatur, sonst abgelehnt', () => {
    const { s, id, writes } = setup();
    expect(s().confirmRepair(id, true)).toEqual({
      ok: false,
      refusal: { code: 'regel', action: 'reparatur_bestaetigen' },
    });
    expect(s().confirmRepair(id, false)).toEqual({
      ok: false,
      refusal: { code: 'regel', action: 'problem_besteht_weiter' },
    });
    expect(s().confirmRepair('GS-99999', true)).toEqual({
      ok: false,
      refusal: { code: 'unbekannt', what: 'fall', id: 'GS-99999' },
    });
    expect(writes()).toBe(0);
  });

  test('ein Ergebnis ohne Fall wird abgelehnt', () => {
    const { s, writes } = setup();
    expect(
      s().addDiagnosis({
        caseId: 'GS-99999',
        photoIds: [],
        mode: 'display',
        errorPattern: 'wasserablauf',
        confidence: 'hoch',
        confidenceScore: 1,
        source: 'fehlererkennung',
      }),
    ).toEqual({ ok: false, refusal: { code: 'unbekannt', what: 'fall', id: 'GS-99999' } });
    expect(writes()).toBe(0);
  });
});

describe('Widerruf in der Reparatur: keine Sackgasse (R-12)', () => {
  const partner = demoConfig.partners[1]!;
  /** Selbst gezahlt, in der Reparatur, dann die Weitergabe an den Betrieb widerrufen */
  const held = () => {
    const store = createAppStore(memoryStorage(), testEnv());
    const s = () => store.getState();
    s().ensureHousehold();
    const device = s().addDevice({
      category: 'waschmaschine',
      manufacturerId: demoConfig.manufacturer.id,
      model: demoConfig.device.model,
      identifiedBy: 'manuell',
    });
    const id = unwrap(s().openCaseFor(device.id, 'foto', 'Foto vom Display')).caseId;
    unwrap(s().escalate(id));
    unwrap(s().setFinding(id, 'reparatur', 'fachkraft'));
    unwrap(
      s().requestBooking({
        caseId: id,
        kind: 'reparatur',
        partnerId: partner.id,
        slotLabel: demoConfig.slots[0]!,
        selfPay: true,
      }),
    );
    const first = s().consents.find((c) => c.purpose === 'weitergabe_betrieb')!;
    s().revokeConsent(first.id);
    return { s, id, deviceId: device.id, first };
  };

  test('der Fall hält an, bietet aber mehr als „Später weitermachen“', () => {
    const { s, id } = held();
    const facts = selectCaseFacts(s(), id)!;
    expect(facts).toMatchObject({ status: 'in_reparatur', hold: 'weitergabe_betrieb' });
    // Seit Nr. 34 auch abbrechen, ohne neue Weitergabe
    expect(availableActions(facts)).toEqual(['weitergabe_erneuern', 'pausieren', 'abbrechen']);
    expect(s().simulateNext(id)).toBe(false);
  });

  test('erneut bestätigen: derselbe Betrieb, derselbe Umfang und Text, dann geht es weiter', () => {
    const { s, id, first } = held();
    const renewed = unwrap(s().renewTransfer(id));
    expect(renewed).toMatchObject({
      caseId: id,
      purpose: 'weitergabe_betrieb',
      legalBasis: first.legalBasis,
      recipient: first.recipient,
      dataCategories: first.dataCategories,
      textVersion: first.textVersion,
      textHash: first.textHash,
    });
    expect(renewed.id).not.toBe(first.id);
    expect(selectCaseEvents(s(), id).at(-1)?.type).toBe('weitergabe_bestaetigt');
    expect(selectCaseFacts(s(), id)?.hold).toBeUndefined();
    expect(s().simulateNext(id)).toBe(true);
    expect(s().bookings.at(-1)?.status).toBe('bestaetigt');
  });

  test('ohne Halt wird abgelehnt, ohne etwas zu schreiben', () => {
    const { s, id } = held();
    unwrap(s().renewTransfer(id));
    const before = s();
    expect(s().renewTransfer(id)).toEqual({
      ok: false,
      refusal: { code: 'regel', action: 'weitergabe_erneuern' },
    });
    expect(s().renewTransfer('GS-99999')).toEqual({
      ok: false,
      refusal: { code: 'unbekannt', what: 'fall', id: 'GS-99999' },
    });
    expect(s()).toBe(before);
  });

  test('Weitergabe an den Versicherer: erneut an den Versicherer des Vertrags', () => {
    const store = createAppStore(memoryStorage(), testEnv());
    const s = () => store.getState();
    s().ensureHousehold();
    const contract = s().linkContract('vertragsnummer');
    const device = s().addDevice({
      category: 'waschmaschine',
      manufacturerId: demoConfig.manufacturer.id,
      model: demoConfig.device.model,
      contractId: contract.id,
      identifiedBy: 'vertrag',
    });
    const id = unwrap(s().openCaseFor(device.id, 'foto', 'Foto vom Display')).caseId;
    unwrap(s().escalate(id));
    unwrap(s().setFinding(id, 'reparatur', 'fachkraft'));
    unwrap(s().reportClaim(id));
    const first = s().consents.find((c) => c.purpose === 'weitergabe_versicherer')!;
    s().revokeConsent(first.id);
    expect(availableActions(selectCaseFacts(s(), id))).toContain('weitergabe_erneuern');
    const renewed = unwrap(s().renewTransfer(id));
    expect(renewed).toMatchObject({
      purpose: 'weitergabe_versicherer',
      recipient: contract.provider,
      textHash: first.textHash,
    });
    expect(s().simulateNext(id)).toBe(true);
    expect(s().cases[id]?.status).not.toBe('freigabe_noetig');
  });

  test('ein neues Problem für das Gerät: weiter nur über den gehaltenen Fall (Nr. 13)', () => {
    const { s, id, deviceId } = held();
    expect(
      unwrap(s().openCaseFor(deviceId, 'symptom', 'Tür geht nicht auf', { neuesProblem: true })),
    ).toEqual({ art: 'frage_weitermachen', caseId: id });
    // Dort steht jetzt ein Weg weiter
    expect(can(selectCaseFacts(s(), id), 'weitergabe_erneuern')).toBe(true);
  });
});

describe('Abbrechen in der Reparatur (Entscheidung Nr. 34)', () => {
  const partner = demoConfig.partners[0]!;
  const setup = () => {
    const store = createAppStore(memoryStorage(), testEnv());
    const s = () => store.getState();
    return { store, s };
  };
  /** Selbst gezahlt: in der Reparatur, der Termin ist zahlungspflichtig gebucht */
  const inRepair = (s: ReturnType<typeof setup>['s']) => {
    const c = s().createCase({ deviceId: 'd-1', entry: 'foto', problemLabel: 'x' });
    unwrap(s().escalate(c.id));
    unwrap(s().setFinding(c.id, 'reparatur', 'fachkraft'));
    const booking = unwrap(
      s().requestBooking({
        caseId: c.id,
        kind: 'reparatur',
        partnerId: partner.id,
        slotLabel: demoConfig.slots[0],
        selfPay: true,
      }),
    );
    return { id: c.id, booking };
  };
  const cancelled = (s: ReturnType<typeof setup>['s'], id: string) =>
    s().events.filter((e) => e.caseId === id && e.type === 'termin_abgesagt');

  test('der Fall ist abgebrochen, der Termin storniert, die Absage steht in der Fallakte', () => {
    const { s } = setup();
    const { id, booking } = inRepair(s);
    expect(s().cases[id]?.status).toBe('in_reparatur');
    expect(can(selectCaseFacts(s(), id), 'abbrechen')).toBe(true);
    expect(
      unwrap(s().runCommand(id, 'abbrechen', { cancelReason: 'Hat sich erledigt' })),
    ).toMatchObject({
      status: 'abgebrochen',
      cancelReason: 'Hat sich erledigt',
    });
    expect(s().bookings.find((b) => b.id === booking.id)?.status).toBe('storniert');
    expect(cancelled(s, id)).toMatchObject([
      {
        actor: { kind: 'haushalt' },
        payload: {
          bookingId: booking.id,
          kind: 'reparatur',
          partner: partner.name,
          slot: demoConfig.slots[0],
          ordered: true,
        },
      },
    ]);
    // Der Betrieb bekommt nur die Absage: keine neue Weitergabe
    expect(s().consents.filter((c) => c.purpose === 'weitergabe_betrieb')).toHaveLength(1);
  });

  test('danach kein Schritt mehr, weder per Timer noch per „Nächster Schritt“', () => {
    const { s } = setup();
    const { id } = inRepair(s);
    expect(nextSimulationDue(s(), id)).toBeDefined();
    unwrap(s().runCommand(id, 'abbrechen', { cancelReason: 'x' }));
    expect(nextSimulationDue(s(), id)).toBeUndefined();
    const before = s();
    expect(s().simulateNext(id)).toBe(false);
    expect(s().bookings).toBe(before.bookings);
    expect(s().events).toBe(before.events);
    expect(availableActions(selectCaseFacts(s(), id))).toEqual([]);
  });

  test('auch mit dem Betrieb unterwegs: storniert, und kein Befund oder Abschluss danach', () => {
    const { s } = setup();
    const { id, booking } = inRepair(s);
    expect(s().simulateNext(id)).toBe(true);
    expect(s().simulateNext(id)).toBe(true);
    expect(s().bookings.find((b) => b.id === booking.id)?.status).toBe('unterwegs');
    unwrap(s().runCommand(id, 'abbrechen', { cancelReason: 'x' }));
    expect(s().simulateNext(id)).toBe(false);
    expect(s().bookings.find((b) => b.id === booking.id)?.status).toBe('storniert');
    expect(s().events.some((e) => e.caseId === id && e.type === 'reparatur_abgeschlossen')).toBe(
      false,
    );
  });

  test('eine Vor-Ort-Diagnose, die der Betrieb bestätigt hat, endet mit dem Abbruch', () => {
    const { s } = setup();
    const c = s().createCase({ deviceId: 'd-1', entry: 'foto', problemLabel: 'x' });
    unwrap(s().escalate(c.id));
    const visit = unwrap(
      s().requestBooking({
        caseId: c.id,
        kind: 'vor_ort_diagnose',
        partnerId: partner.id,
        slotLabel: demoConfig.slots[0],
        selfPay: false,
      }),
    );
    expect(s().simulateNext(c.id)).toBe(true);
    unwrap(s().bookBinding(c.id, demoConfig.prices.diagnosis));
    expect(s().simulateNext(c.id)).toBe(true);
    expect(s().bookings.find((b) => b.id === visit.id)?.status).toBe('bestaetigt');
    unwrap(s().runCommand(c.id, 'abbrechen', { cancelReason: 'x' }));
    // Früher lief die Simulation hier weiter bis zum Befund
    expect(s().simulateNext(c.id)).toBe(false);
    expect(s().bookings.find((b) => b.id === visit.id)?.status).toBe('storniert');
    expect(s().diagnoses.filter((d) => d.caseId === c.id && d.source === 'betrieb')).toEqual([]);
    expect(cancelled(s, c.id)).toMatchObject([{ payload: { ordered: true } }]);
  });

  test('eine unverbindliche Anfrage wird abgesagt, ohne Auftrag', () => {
    const { s } = setup();
    const c = s().createCase({ deviceId: 'd-1', entry: 'foto', problemLabel: 'x' });
    unwrap(s().escalate(c.id));
    unwrap(
      s().requestBooking({
        caseId: c.id,
        kind: 'vor_ort_diagnose',
        partnerId: partner.id,
        slotLabel: demoConfig.slots[0],
        selfPay: false,
      }),
    );
    expect(selectCaseFacts(s(), c.id)?.order).toBeUndefined();
    unwrap(s().runCommand(c.id, 'abbrechen', { cancelReason: 'x' }));
    expect(cancelled(s, c.id)).toMatchObject([{ payload: { ordered: false } }]);
    expect(
      s()
        .bookings.filter((b) => b.caseId === c.id)
        .map((b) => b.status),
    ).toEqual(['storniert']);
  });

  // Vor Nr. 34 blieb der Termin beim Abbrechen stehen. Ein gespeicherter Stand kann das noch haben.
  test('ein älterer Stand, abgebrochen mit laufendem Termin: kein Schritt mehr', () => {
    const { store, s } = setup();
    const { id, booking } = inRepair(s);
    expect(s().simulateNext(id)).toBe(true);
    store.setState((x) => ({
      cases: { ...x.cases, [id]: { ...x.cases[id]!, status: 'abgebrochen' } },
    }));
    expect(s().bookings.find((b) => b.id === booking.id)?.status).toBe('bestaetigt');
    expect(nextSimulationDue(s(), id)).toBeUndefined();
    const before = s();
    expect(s().simulateNext(id)).toBe(false);
    expect(s()).toBe(before);
  });

  test('nach einem Widerruf: abbrechen geht, ohne neue Weitergabe an den Betrieb', () => {
    const { s } = setup();
    const { id, booking } = inRepair(s);
    const consent = s().consents.find((c) => c.purpose === 'weitergabe_betrieb')!;
    s().revokeConsent(consent.id);
    const facts = selectCaseFacts(s(), id)!;
    expect(facts.hold).toBe('weitergabe_betrieb');
    expect(availableActions(facts)).toEqual(
      expect.arrayContaining(['weitergabe_erneuern', 'abbrechen']),
    );
    unwrap(s().runCommand(id, 'abbrechen', { cancelReason: 'x' }));
    expect(s().bookings.find((b) => b.id === booking.id)?.status).toBe('storniert');
    expect(s().consents.filter((c) => c.purpose === 'weitergabe_betrieb' && !c.revokedAt)).toEqual(
      [],
    );
  });
  // Gegenprüfung Nr. 31 bis 34 (F4, R3): Ist der Betrieb fertig, gibt es nichts mehr abzusagen.
  // Ein Abbruch würde nur „Läuft wieder“, die Bewertung und die Gewährleistung nehmen.
  test('ist der Betrieb fertig, lehnt der Store den Abbruch ab, und die Gewährleistung bleibt', () => {
    const { s } = setup();
    const { id, booking } = inRepair(s);
    while (s().simulateNext(id));
    expect(s().bookings.find((b) => b.id === booking.id)?.status).toBe('erledigt');
    const facts = selectCaseFacts(s(), id)!;
    expect(can(facts, 'abbrechen')).toBe(false);
    expect(availableActions(facts)).toEqual([
      'reparatur_bestaetigen',
      'problem_besteht_weiter',
      'bewerten',
      'pausieren',
    ]);
    const before = s();
    expect(s().runCommand(id, 'abbrechen', { cancelReason: 'Hat sich erledigt' })).toEqual({
      ok: false,
      refusal: { code: 'regel', action: 'abbrechen' },
    });
    expect(s().cases).toBe(before.cases);
    expect(s().events).toBe(before.events);
    expect(s().bookings).toBe(before.bookings);
    // Der Weg in die Nachbesserung ist noch da
    expect(unwrap(s().confirmRepair(id, false)).status).toBe('nachbesserung');
  });
});

describe('Gewährleistung nach „Problem besteht weiter“ (Entscheidung Nr. 32)', () => {
  const partner = demoConfig.partners[0]!;
  /** Uhr, die der Test vorstellen kann */
  const clock = { t: Date.parse('2026-11-04T09:00:00.000Z') };
  const env: StoreEnv = (() => {
    let n = 0;
    return {
      now: () => new Date((clock.t += 1000)).toISOString(),
      newId: (p) => `${p}-${++n}`,
    };
  })();
  /**
   * Mit Schutz und 50 € Selbstbeteiligung: Schadenfall, Freigabe, „Zahlungspflichtig buchen“,
   * dann repariert der Betrieb. Danach fragt mach’s, ob es läuft.
   */
  const repaired = (store = createAppStore(memoryStorage(), env)) => {
    clock.t = Date.parse('2026-11-04T09:00:00.000Z');
    const s = () => store.getState();
    s().ensureHousehold();
    s().setDemo({ deductible: 5000 });
    const contract = s().linkContract('vertragsnummer');
    const device = s().addDevice({
      category: 'waschmaschine',
      manufacturerId: demoConfig.manufacturer.id,
      model: demoConfig.device.model,
      identifiedBy: 'vertrag',
      contractId: contract.id,
    });
    const id = unwrap(s().openCaseFor(device.id, 'foto', 'Foto vom Display')).caseId;
    unwrap(s().escalate(id));
    unwrap(s().setFinding(id, 'reparatur', 'fachkraft'));
    unwrap(s().reportClaim(id));
    const repair = unwrap(
      s().requestBooking({
        caseId: id,
        kind: 'reparatur',
        partnerId: partner.id,
        slotLabel: demoConfig.slots[0],
        selfPay: false,
      }),
    );
    expect(s().simulateNext(id)).toBe(true);
    unwrap(s().bookBinding(id, 5000));
    while (s().simulateNext(id));
    expect(s().bookings.find((b) => b.id === repair.id)).toMatchObject({
      status: 'erledigt',
      completedAt: expect.any(String),
    });
    return { store, s, id, repair, deviceId: device.id };
  };
  const eventsOf = (s: () => AppState, id: string, type: string) =>
    s().events.filter((e) => e.caseId === id && e.type === type);

  test('innerhalb der Frist: Nachbesserung beim selben Betrieb, ohne Schadenfall und ohne Betrag', () => {
    const { s, id, repair } = repaired();
    const done = s().bookings.find((b) => b.id === repair.id)!;
    const consents = s().consents.length;
    const claims = eventsOf(s, id, 'schaden_gemeldet').length;
    const next = unwrap(s().confirmRepair(id, false));
    expect(next).toMatchObject({
      status: 'nachbesserung',
      rework: {
        repairBookingId: repair.id,
        provider: { id: partner.id, name: partner.name },
        completedAt: done.completedAt,
        until: addMonths(done.completedAt!, demoConfig.warranty.months),
      },
    });
    // Keine neue Meldung an den Versicherer, die alte bleibt an ihrer Runde
    expect(next.claim).toBeUndefined();
    expect(next.rounds?.[0]?.claim?.decision?.result).toBe('freigegeben');
    expect(eventsOf(s, id, 'schaden_gemeldet')).toHaveLength(claims);
    expect(eventsOf(s, id, 'nachbesserung_verlangt')).toMatchObject([
      { payload: { bookingId: repair.id, partner: partner.name, until: next.rework!.until } },
    ]);
    const facts = selectCaseFacts(s(), id)!;
    expect(facts).toMatchObject({ payer: 'betrieb', claim: 'keiner' });
    expect(facts.bindingDue).toBeUndefined();
    expect(availableActions(facts)).toEqual(['nachbesserung_anfragen', 'pausieren', 'abbrechen']);

    // Der Termin: derselbe Betrieb, ohne Freigabe, ohne Betrag, ohne neue Weitergabe
    const visit = unwrap(s().requestRework(id, demoConfig.slots[2]));
    expect(visit).toMatchObject({
      kind: 'reparatur',
      provider: { id: partner.id },
      slotLabel: demoConfig.slots[2],
      status: 'angefragt',
      subjectToApproval: false,
      reworkOf: repair.id,
    });
    expect(visit.binding).toBeUndefined();
    expect(s().consents).toHaveLength(consents);
    expect(eventsOf(s, id, 'termin_angefragt').at(-1)?.payload).toMatchObject({ rework: true });
    // Ein zweiter Termin wird abgelehnt, ohne etwas zu schreiben
    const before = s();
    expect(s().requestRework(id, demoConfig.slots[3])).toEqual({
      ok: false,
      refusal: { code: 'termin_laeuft', kind: 'reparatur' },
    });
    expect(s()).toBe(before);

    // Der Betrieb kommt, ohne „Zahlungspflichtig buchen“, und ist fertig
    const taps = eventsOf(s, id, 'zahlungspflichtig_gebucht').length;
    while (s().simulateNext(id));
    expect(s().bookings.find((b) => b.id === visit.id)).toMatchObject({
      status: 'erledigt',
      completedAt: expect.any(String),
    });
    expect(eventsOf(s, id, 'zahlungspflichtig_gebucht')).toHaveLength(taps);
    expect(eventsOf(s, id, 'reparatur_abgeschlossen').at(-1)?.payload).toMatchObject({
      rework: true,
    });
    expect(unwrap(s().confirmRepair(id, true))).toMatchObject({
      status: 'erledigt',
      resolution: 'repariert',
    });
  });

  test('hilft auch die Nachbesserung nicht: neue Runde, die Nachbesserung steht an ihrer Runde', () => {
    const { s, id } = repaired();
    const first = unwrap(s().confirmRepair(id, false)).rework!;
    unwrap(s().requestRework(id, demoConfig.slots[2]));
    while (s().simulateNext(id));
    const next = unwrap(s().confirmRepair(id, false));
    expect(next.status).toBe('eskaliert');
    expect(next.rework).toBeUndefined();
    expect(next.rounds?.map((r) => r.rework)).toEqual([undefined, first]);
    expect(eventsOf(s, id, 'problem_besteht_weiter').at(-1)?.payload).toMatchObject({
      warranty: 'nachbesserung_gescheitert',
    });
    // Die neue Runde geht über Hilfe holen. Ein Schadenfall entsteht nur mit eigenem Tap.
    const facts = selectCaseFacts(s(), id)!;
    expect(availableActions(facts)).toEqual(
      expect.arrayContaining(['videocall_anfragen', 'termin_diagnose']),
    );
    expect(can(facts, 'nachbesserung_anfragen')).toBe(false);
    expect(next.claim).toBeUndefined();
    unwrap(s().setFinding(id, 'reparatur', 'fachkraft'));
    expect(can(selectCaseFacts(s(), id), 'schaden_melden')).toBe(true);
    expect(s().cases[id]?.claim).toBeUndefined();
  });

  test('nach Ablauf der Frist: neue Runde wie bisher', () => {
    const { s, id } = repaired();
    clock.t += Date.parse(addMonths(new Date(clock.t).toISOString(), 25)) - clock.t;
    const next = unwrap(s().confirmRepair(id, false));
    expect(next).toMatchObject({ status: 'eskaliert' });
    expect(next.rework).toBeUndefined();
    expect(eventsOf(s, id, 'nachbesserung_verlangt')).toEqual([]);
    expect(eventsOf(s, id, 'problem_besteht_weiter').at(-1)?.payload).toEqual({
      warranty: 'abgelaufen',
    });
  });

  test('Demo „Reparatur liegt länger zurück“: neue Runde, und die Fallakte sagt, dass es die Demo war', () => {
    const { s, id, repair } = repaired();
    const completedAt = s().bookings.find((b) => b.id === repair.id)?.completedAt;
    s().setDemo({ repairLongAgo: true });
    const next = unwrap(s().confirmRepair(id, false));
    expect(next.status).toBe('eskaliert');
    expect(eventsOf(s, id, 'problem_besteht_weiter').at(-1)?.payload).toEqual({
      warranty: 'abgelaufen',
      demoLongAgo: true,
    });
    // Kein Datum wird geändert
    expect(s().bookings.find((b) => b.id === repair.id)?.completedAt).toBe(completedAt);
  });

  test('nach einem Widerruf: erst die Weitergabe erneut bestätigen, dann der Termin', () => {
    const { s, id } = repaired();
    unwrap(s().confirmRepair(id, false));
    for (const c of s().consents.filter((k) => k.purpose === 'weitergabe_betrieb')) {
      s().revokeConsent(c.id);
    }
    const facts = selectCaseFacts(s(), id)!;
    expect(facts.hold).toBe('weitergabe_betrieb');
    expect(availableActions(facts)).toEqual(['weitergabe_erneuern', 'pausieren', 'abbrechen']);
    const before = s();
    expect(s().requestRework(id, demoConfig.slots[2])).toEqual({
      ok: false,
      refusal: { code: 'bestaetigung', purpose: 'weitergabe_betrieb' },
    });
    expect(s()).toBe(before);
    expect(unwrap(s().renewTransfer(id)).recipient).toMatchObject({ id: partner.id });
    expect(unwrap(s().requestRework(id, demoConfig.slots[2])).reworkOf).toBeDefined();
  });

  test('auch nach „Läuft wieder“, und je Gerät bleibt es ein offener Fall', () => {
    const { s, id, deviceId } = repaired();
    unwrap(s().confirmRepair(id, true));
    expect(unwrap(s().confirmRepair(id, false)).status).toBe('nachbesserung');
    expect(selectOpenCases(s()).filter((c) => c.deviceId === deviceId)).toHaveLength(1);
    unwrap(s().requestRework(id, demoConfig.slots[2]));
    expect(s().simulateNext(id)).toBe(true);
    // Ein neues Problem für das Gerät bricht den Auftrag nicht nebenbei ab (Nr. 13, Nr. 34)
    expect(
      unwrap(s().openCaseFor(deviceId, 'symptom', 'Tür geht nicht auf', { neuesProblem: true })),
    ).toEqual({ art: 'frage_weitermachen', caseId: id });
    expect(selectOpenCases(s()).filter((c) => c.deviceId === deviceId)).toHaveLength(1);
  });

  test('Nachbesserung abbrechen: Absage ohne den Satz zu den Kosten', () => {
    const { s, id } = repaired();
    unwrap(s().confirmRepair(id, false));
    const visit = unwrap(s().requestRework(id, demoConfig.slots[2]));
    unwrap(s().runCommand(id, 'abbrechen', { cancelReason: 'x' }));
    expect(s().bookings.find((b) => b.id === visit.id)?.status).toBe('storniert');
    expect(eventsOf(s, id, 'termin_abgesagt')).toMatchObject([
      { payload: { bookingId: visit.id, ordered: true, costsOpen: false } },
    ]);
  });

  test('Nachbesserung, Abschluss und Termin überstehen den Neustart', async () => {
    const storage = memoryStorage();
    const first = createAppStore(storage, env);
    await first.persist.rehydrate();
    const { s, id } = repaired(first);
    unwrap(s().confirmRepair(id, false));
    const visit = unwrap(s().requestRework(id, demoConfig.slots[2]));
    const second = createAppStore(storage, env);
    await second.persist.rehydrate();
    const restored = second.getState();
    expect(restored.cases[id]?.rework).toEqual(s().cases[id]?.rework);
    expect(restored.cases[id]?.rounds).toEqual(s().cases[id]?.rounds);
    expect(restored.bookings.find((b) => b.id === visit.id)?.reworkOf).toBe(visit.reworkOf);
    expect(restored.bookings.find((b) => b.id === visit.reworkOf)?.completedAt).toBeDefined();
    expect(selectCaseFacts(restored, id)?.rework).toBeDefined();
  });
});

// mach’s: Wer hilft und wer prüft, hängt am Gerät (Entscheidung 16). Befund, Termin und Freigabe
// kommen vom Kundendienst des Händlers oder vom Versicherer aus der Liste, nicht aus der Konfiguration.
describe('Händler und Versicherer je Gerät', () => {
  const env = testEnv();
  const dealer = demoConfig.dealers[0]!;
  const service = dealer.service!;

  function boughtAtDealer() {
    const store = createAppStore(memoryStorage(), env);
    const s = () => store.getState();
    s().completeOnboarding();
    const device = s().addDevice({
      manufacturerId: 'miele',
      category: 'geschirrspueler',
      model: 'G 5833 SC',
      identifiedBy: 'katalog',
    });
    s().setDeviceDealer(device.id, dealer.id);
    const c = s().createCase({ deviceId: device.id, entry: 'symptom', problemLabel: 'Wasser' });
    unwrap(s().escalate(c.id));
    return { s, id: c.id };
  }

  test('beim Händler gekauft: Befund und Termin vom Kundendienst des Händlers', () => {
    const { s, id } = boughtAtDealer();
    unwrap(s().setFinding(id, 'reparatur', 'fachkraft'));
    expect(s().events.findLast((e) => e.type === 'befund_erstellt')?.actor).toEqual({
      kind: 'fachkraft',
      name: service.expert,
    });
    const booking = unwrap(
      s().requestBooking({
        caseId: id,
        kind: 'reparatur',
        partnerId: `${dealer.id}-kundendienst`,
        slotLabel: demoConfig.slots[0]!,
        selfPay: true,
      }),
    );
    expect(booking.provider).toMatchObject({ name: service.name, kind: 'betrieb' });
    expect(s().cases[id]?.claim).toBeUndefined();
  });

  test('beim Händler gekauft: ein Betrieb aus der Konfiguration ist hier unbekannt', () => {
    const { s, id } = boughtAtDealer();
    unwrap(s().setFinding(id, 'reparatur', 'fachkraft'));
    const partnerId = demoConfig.partners[0]!.id;
    expect(
      s().requestBooking({
        caseId: id,
        kind: 'reparatur',
        partnerId,
        slotLabel: demoConfig.slots[0]!,
        selfPay: true,
      }),
    ).toEqual({ ok: false, refusal: { code: 'unbekannt', what: 'betrieb', id: partnerId } });
    expect(s().bookings).toEqual([]);
  });

  test('Versicherung aus der Liste: dieser Versicherer entscheidet über die Freigabe', () => {
    const store = createAppStore(memoryStorage(), env);
    const s = () => store.getState();
    s().completeOnboarding();
    const insurer = demoConfig.insurers.find((i) => i.id !== demoConfig.insurer.id)!;
    const device = s().addDevice({
      manufacturerId: 'miele',
      category: 'waschmaschine',
      model: 'WKB 130',
      identifiedBy: 'katalog',
    });
    s().linkPolicy({ deviceId: device.id, insurerId: insurer.id, policyNumber: 'P-1' });
    const c = s().createCase({ deviceId: device.id, entry: 'symptom', problemLabel: 'Wasser' });
    unwrap(s().escalate(c.id));
    unwrap(s().setFinding(c.id, 'reparatur', 'fachkraft'));
    unwrap(s().reportClaim(c.id));
    expect(s().simulateNext(c.id)).toBe(true);
    expect(s().events.findLast((e) => e.type === 'freigabe_entschieden')?.actor).toMatchObject({
      kind: 'versicherer',
      name: insurer.name,
    });
  });
});
