import type { StateStorage } from 'zustand/middleware';

import { ConsentRequiredError } from '@/model/caseMachine';
import { createAppStore, selectCaseEvents, selectOpenCases } from '@/store/appStore';
import type { StoreEnv } from '@/store/env';

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
    expect(() => s().runCommand(c.id, 'schaden_melden', { contractId: 'k-1' })).toThrow(
      ConsentRequiredError,
    );
    const consent = s().grantConsent({
      caseId: c.id,
      purpose: 'weitergabe_versicherer',
      legalBasis: 'vertrag',
      recipient,
      dataCategories: ['Fotos', 'Protokoll', 'Befund'],
      textVersion: '1',
    });
    expect(s().runCommand(c.id, 'schaden_melden', { contractId: 'k-1' }).status).toBe(
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
