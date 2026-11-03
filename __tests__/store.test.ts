import type { StateStorage } from 'zustand/middleware';

import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';
import { createAppStore, selectCaseEvents, selectOpenCases } from '@/store/appStore';
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
    expect(store.getState().household?.address?.city).toBe('Berlin');
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
    const r = s().openCaseFor('d-1', 'symptom', 'Wäsche noch nass');
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
    const first = s().openCaseFor('d-1', 'symptom', 'Wäsche noch nass');
    s().pauseCase(first.caseId);
    const r = s().openCaseFor('d-1', 'foto', 'Foto vom Display');
    expect(r).toEqual({ art: 'ersetzt', caseId: first.caseId });
    expect(s().cases[r.caseId]).toMatchObject({ entry: 'foto', problemLabel: 'Foto vom Display' });
    expect(s().cases[r.caseId]?.pausedAt).toBeUndefined();
    expect(openOf(s, 'd-1')).toHaveLength(1);
  });

  test('mit Fortschritt: nichts ändert sich, ganz fragt', () => {
    const { s } = setup();
    const first = s().openCaseFor('d-1', 'symptom', 'Wäsche noch nass');
    s().runCommand(first.caseId, 'hilfe_holen');
    const before = s().events.length;
    expect(s().openCaseFor('d-1', 'symptom', 'Tür geht nicht auf')).toEqual({
      art: 'frage_weitermachen',
      caseId: first.caseId,
    });
    expect(s().events).toHaveLength(before);
    expect(s().cases[first.caseId]?.problemLabel).toBe('Wäsche noch nass');
  });

  test('„Neues Problem melden“: der alte Fall wird abgebrochen, dann gibt es einen neuen', () => {
    const { s } = setup();
    const first = s().openCaseFor('d-1', 'symptom', 'Wäsche noch nass');
    s().runCommand(first.caseId, 'hilfe_holen');
    const r = s().openCaseFor('d-1', 'symptom', 'Tür geht nicht auf', { neuesProblem: true });
    expect(r.art).toBe('neu');
    expect(r.caseId).not.toBe(first.caseId);
    expect(s().cases[first.caseId]).toMatchObject({
      status: 'abgebrochen',
      cancelReason: de.thread.newProblemReason,
    });
    expect(openOf(s, 'd-1').map((c) => c.id)).toEqual([r.caseId]);
  });

  test('in der Reparatur: kein Abbruch, kein Absturz, nur die Frage', () => {
    const { s } = setup();
    const first = s().openCaseFor('d-1', 'symptom', 'Wäsche noch nass');
    s().runCommand(first.caseId, 'hilfe_holen');
    s().runCommand(first.caseId, 'selbst_zahlen');
    const r = s().openCaseFor('d-1', 'symptom', 'Tür geht nicht auf', { neuesProblem: true });
    expect(r).toEqual({ art: 'frage_weitermachen', caseId: first.caseId });
    expect(s().cases[first.caseId]?.status).toBe('in_reparatur');
    expect(openOf(s, 'd-1')).toHaveLength(1);
  });

  test('das Problem des eigenen Falls ändern („Passt nicht“): derselbe Fall, auch mit Foto', () => {
    const { s } = setup();
    const first = s().openCaseFor('d-1', 'foto', 'Foto vom Display');
    s().addPhoto({
      caseId: first.caseId,
      deviceId: 'd-1',
      purpose: 'display',
      source: 'in_app_camera',
      uri: '',
    });
    expect(s().openCaseFor('d-1', 'symptom', 'Tür geht nicht auf').art).toBe('frage_weitermachen');
    const r = s().openCaseFor('d-1', 'symptom', 'Tür geht nicht auf', { aendern: first.caseId });
    expect(r).toEqual({ art: 'ersetzt', caseId: first.caseId });
    expect(s().cases[r.caseId]).toMatchObject({ entry: 'symptom', photoIds: [expect.any(String)] });
    expect(openOf(s, 'd-1')).toHaveLength(1);
  });

  test('ein anderes Gerät bleibt unberührt', () => {
    const { s } = setup();
    const a = s().openCaseFor('d-1', 'symptom', 'Wäsche noch nass');
    const b = s().openCaseFor('d-2', 'symptom', 'Tür geht nicht auf');
    expect([a.art, b.art]).toEqual(['neu', 'neu']);
    expect(s().cases[a.caseId]?.problemLabel).toBe('Wäsche noch nass');
  });
});

describe('startGuide: nie zwei offene Anleitungen (B-05, R-06)', () => {
  const setup = () => {
    const store = createAppStore(memoryStorage(), testEnv());
    const s = () => store.getState();
    const id = s().openCaseFor('d-1', 'symptom', 'Wäsche noch nass').caseId;
    return { s, id };
  };
  const open = (s: () => ReturnType<ReturnType<typeof createAppStore>['getState']>, id: string) =>
    Object.values(s().guideRuns).filter((r) => r.caseId === id && !r.endedAt);

  test('dieselbe Anleitung geht weiter, wo du warst', () => {
    const { s, id } = setup();
    const run = s().startGuide(id, 'nass');
    s().moveGuideStep(run.id, 'next');
    const again = s().startGuide(id, 'nass');
    expect(again.id).toBe(run.id);
    expect(s().guideRuns[run.id]).toMatchObject({ currentStep: 1, completedSteps: [0] });
    expect(s().cases[id]?.guideRunIds).toEqual([run.id]);
  });

  test('eine andere Anleitung beendet die offene, die erledigten Schritte bleiben', () => {
    const { s, id } = setup();
    const run = s().startGuide(id, 'nass');
    s().moveGuideStep(run.id, 'next');
    const next = s().startGuide(id, 'tuer');
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
    const run = s().startGuide(id, 'nass');
    expect(s().openCaseFor('d-1', 'symptom', 'Wäsche noch nass', { guideId: 'nass' }).art).toBe(
      'ersetzt',
    );
    expect(open(s, id).map((r) => r.id)).toEqual([run.id]);
    s().openCaseFor('d-1', 'foto', 'Foto vom Display');
    expect(open(s, id)).toEqual([]);
    // Ohne erledigten Schritt ist das kein Fortschritt, der nächste Versuch ersetzt wieder
    expect(s().openCaseFor('d-1', 'symptom', 'Tür geht nicht auf').art).toBe('ersetzt');
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

  test('ein verbotener Übergang wird abgelehnt, Fall und Akte bleiben', () => {
    const { s } = setup();
    const c = s().createCase({ deviceId: 'd-1', entry: 'foto', problemLabel: 'x' });
    unwrap(s().runCommand(c.id, 'hilfe_holen'));
    unwrap(s().runCommand(c.id, 'selbst_zahlen'));
    const before = { case: s().cases[c.id], events: s().events.length };
    expect(s().runCommand(c.id, 'abbrechen', { cancelReason: 'x' })).toEqual({
      ok: false,
      refusal: { code: 'uebergang', from: 'in_reparatur', command: 'abbrechen' },
    });
    expect(s().cases[c.id]).toBe(before.case);
    expect(s().events).toHaveLength(before.events);
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
    const reported = unwrap(s().reportClaim(id, '1'));
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
    unwrap(s().reportClaim(id, '1'));
    expect(s().reportClaim(id, '1')).toEqual({
      ok: false,
      refusal: { code: 'regel', action: 'schaden_melden' },
    });
    expect(writes()).toBe(1);
    expect(s().consents.filter((c) => c.purpose === 'weitergabe_versicherer')).toHaveLength(1);
  });

  test('ohne Schutz und ohne Fall keine Meldung', () => {
    const without = setup(false);
    expect(without.s().reportClaim(without.id, '1')).toEqual({
      ok: false,
      refusal: { code: 'vertrag' },
    });
    expect(without.s().reportClaim('GS-99999', '1')).toEqual({
      ok: false,
      refusal: { code: 'unbekannt', what: 'fall', id: 'GS-99999' },
    });
    expect(without.writes()).toBe(0);
  });

  test('selbst zahlen: Status, Bestätigung, Termin und Ereignisse auf einmal', () => {
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
    expect(booking).toMatchObject({ provider: { id: partner.id }, subjectToApproval: false });
    expect(
      selectCaseEvents(s(), id)
        .slice(-3)
        .map((e) => e.type),
    ).toEqual(['status_geaendert', 'weitergabe_bestaetigt', 'termin_angefragt']);
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
