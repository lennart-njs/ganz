import * as fs from 'fs';
import * as path from 'path';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { demoConfig } from '@/config/demo.config';
import { fruendSettings } from '@/config/portal.demo';
import { de } from '@/i18n/de';
import { catalog } from '@/data/catalog';
import { deviceTitle } from '@/lib/devices';
import { warrantyCheck } from '@/portal/lib/check';
import { seedRecords } from '@/server/backend/seed';
import { defaultDemoSettings, initialData, useAppStore, type AppData } from '@/store/appStore';
import { DEMO_START_IDS, demoStartData } from '@/store/demoStart';
import { parseStoredState } from '@/store/storedState';
import { APP } from '@/test/app';

const tap = (name: string | RegExp) => fireEvent.press(screen.getByRole('button', { name }));
const tree = () => JSON.stringify(screen.toJSON());

/** Golden Path bis zum Termin, mit Diagnose, Anleitung, Befund und Meldung */
function goldenCase() {
  const s = useAppStore.getState();
  s.reset();
  useAppStore.setState({ onboardingDone: true });
  s.linkContract('vertragsnummer');
  const device = s.addDevice({
    manufacturerId: demoConfig.manufacturer.id,
    category: 'waschmaschine',
    model: 'WKB 130',
    identifiedBy: 'vertrag',
    contractId: useAppStore.getState().contracts[0]!.id,
  });
  const c = s.createCase({
    deviceId: device.id,
    entry: 'foto',
    problemLabel: 'Wasserablauf gestört',
  });
  s.addDiagnosis({
    caseId: c.id,
    photoIds: [],
    mode: 'display',
    errorPattern: 'wasserablauf',
    displayMessage: 'Wasserablauf',
    component: de.result.component.wasserablauf,
    confidence: 'hoch',
    confidenceScore: 0.9,
    source: 'fehlererkennung',
    guideId: 'ablauf',
  });
  s.escalate(c.id);
  s.setFinding(c.id, 'reparatur', 'fachkraft');
  return { caseId: c.id, deviceId: device.id };
}

describe('Whitelabel', () => {
  const original = { ...demoConfig.insurer };
  const insurer = demoConfig.insurer as { name: string; shortName: string };

  afterEach(() => {
    insurer.name = original.name;
    insurer.shortName = original.shortName;
  });

  test('i18n/de.ts enthält keine Namen aus der Konfiguration', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '../i18n/de.ts'), 'utf8');
    const names = [
      demoConfig.insurer.name,
      demoConfig.insurer.shortName,
      demoConfig.manufacturer.name,
      demoConfig.expert.name,
      demoConfig.contract.number,
      ...demoConfig.partners.map((p) => p.name),
    ];
    expect(names.filter((n) => source.includes(n))).toEqual([]);
  });

  describe('ein anderer Versicherer in der Konfiguration ändert alle Texte', () => {
    beforeEach(() => {
      insurer.name = 'Möwe Versicherung';
      insurer.shortName = 'Möwe';
    });
    const clean = () => {
      const json = tree();
      expect(json).not.toContain(original.shortName);
      return json;
    };

    test('Gerätedetail', async () => {
      const { deviceId } = goldenCase();
      await renderRouter(APP, { initialUrl: `/geraet/${deviceId}` });
      expect(clean()).toContain('Möwe');
    });

    test('Hilfe holen', async () => {
      const { caseId } = goldenCase();
      await renderRouter(APP, { initialUrl: `/fall/${caseId}` });
      expect(clean()).toContain('Möwe');
    });

    test('Kosten, Vorschau, Termin und Status', async () => {
      const { caseId } = goldenCase();
      const r = await renderRouter(APP, { initialUrl: `/fall/${caseId}/kosten` });
      await tap(de.costs.preview('Möwe'));
      expect(clean()).toContain(de.costs.payerValue('Möwe'));
      await tap(de.costs.report);
      expect(clean()).toContain('Möwe');
      await fireEvent.press(screen.getByRole('radio', { name: demoConfig.slots[0] }));
      await tap(de.appointment.request);
      expect(r.getPathname()).toBe(`/fall/${caseId}`);
      expect(clean()).toContain(de.status.headline.pruefung('Möwe'));
    });

    test('Profil', async () => {
      goldenCase();
      await renderRouter(APP, { initialUrl: '/profil' });
      expect(clean()).toContain('Möwe Versicherung');
    });
  });
});

describe('Demo-Modus', () => {
  test('mit Hinweisen: Tipps, Demo-Knöpfe und Beispielwerte', async () => {
    const { caseId } = goldenCase();
    useAppStore.getState().setDemo({ hints: true });
    await renderRouter(APP, { initialUrl: `/fall/${caseId}/kosten` });
    expect(screen.getByText(de.demoHints.kosten)).toBeTruthy();
    expect(screen.getByText(de.common.exampleValues)).toBeTruthy();
    await tap(de.demoHints.dismiss);
    expect(screen.queryByText(de.demoHints.kosten)).toBeNull();
    expect(useAppStore.getState().demo.dismissedHints).toContain('kosten');
  });

  describe('Hinweise aus: keine Demo-Spur in der App', () => {
    const traces = ['(Demo)', de.common.exampleValues, de.demoHints.dismiss, 'Demo-Steuerung'];
    const assertClean = () => traces.forEach((x) => expect(tree()).not.toContain(x));
    let caseId = '';
    beforeEach(() => {
      caseId = goldenCase().caseId;
      useAppStore.getState().setDemo({ hints: false });
    });

    test('Startseite', async () => {
      await renderRouter(APP, { initialUrl: '/' });
      assertClean();
    });

    test('Kosten, Termin und Status', async () => {
      await renderRouter(APP, { initialUrl: `/fall/${caseId}/kosten` });
      assertClean();
      await tap(de.costs.report);
      await fireEvent.press(screen.getByRole('radio', { name: demoConfig.slots[0] }));
      await tap(de.appointment.request);
      assertClean();
    });

    test('Profil', async () => {
      await renderRouter(APP, { initialUrl: '/profil' });
      assertClean();
    });
  });

  test('7-mal auf die Version tippen öffnet die Demo-Steuerung', async () => {
    goldenCase();
    await renderRouter(APP, { initialUrl: '/profil' });
    const version = screen.getByText(/^Version/);
    for (let i = 0; i < 6; i++) await fireEvent.press(version);
    expect(screen.queryByText(de.demoControl.title)).toBeNull();
    await fireEvent.press(version);
    expect(screen.getByText(de.demoControl.title)).toBeTruthy();

    await fireEvent.press(
      screen.getByRole('radio', { name: de.demoControl.diagnosisOptions.unsicher }),
    );
    await fireEvent.press(
      screen.getByRole('radio', { name: de.demoControl.claimOptions.ablehnen }),
    );
    await fireEvent.press(screen.getByRole('radio', { name: '50 €' }));
    const demo = useAppStore.getState().demo;
    expect(demo).toMatchObject({
      diagnosisScenario: 'unsicher',
      claimScenario: 'ablehnen',
      deductible: 5000,
    });
    expect(useAppStore.getState().contracts[0]?.deductible).toBe(5000);

    // Für den Pitch sind die Hinweise aus (Entscheidung 21), die Steuerung schaltet sie an
    await fireEvent.press(screen.getByRole('checkbox', { name: de.demoControl.hints }));
    expect(useAppStore.getState().demo.hints).toBe(true);
  });

  test('„Offene Fälle einen Schritt weiter“ schaltet den Status', async () => {
    const { caseId } = goldenCase();
    useAppStore.getState().reportClaim(caseId);
    await renderRouter(APP, { initialUrl: '/profil' });
    const version = screen.getByText(/^Version/);
    for (let i = 0; i < 7; i++) await fireEvent.press(version);
    await tap(de.demoControl.advance);
    await act(async () => {});
    expect(useAppStore.getState().cases[caseId]?.status).toBe('freigegeben');
    expect(screen.getByText(de.demoControl.advanced(1))).toBeTruthy();
  });
});

describe('Demo-Startstand', () => {
  /** Alles, was gespeichert wird, ohne Aktionen */
  const data = (): AppData => useAppStore.persist.getOptions().partialize!(useAppStore.getState());
  const openDemoControl = async () => {
    const r = await renderRouter(APP, { initialUrl: '/profil' });
    const version = screen.getByText(/^Version/);
    for (let i = 0; i < 7; i++) await fireEvent.press(version);
    return r;
  };
  const dealer = demoConfig.dealers[0]!;
  const fruendModel = catalog.find((m) => m.id === demoConfig.dealerDemo.catalogId)!;
  /** Ganze Monate zwischen zwei Zeitpunkten, wie die Prüfung im Portal (portal/lib/check.ts) */
  const monthsBetween = (from: string, to: string) =>
    Math.floor((Date.parse(to) - Date.parse(from)) / (30.44 * 86_400_000));
  /** Gespeicherter Stand mit den festen IDs und Zeiten des Startstands */
  const withStartIds = (s: AppData, times: string[]): AppData => {
    const ids = DEMO_START_IDS;
    const at = demoConfig.demo.startAt;
    const replace: [string, string][] = [
      [s.persons[0]!.id, ids.person],
      [s.household!.id, ids.household],
      [s.devices[0]!.id, ids.device],
      ...(s.contracts[0] ? ([[s.contracts[0].id, ids.contract]] as [string, string][]) : []),
      ...times.map((t): [string, string] => [t, at]),
    ];
    const json = replace.reduce((j, [from, to]) => j.split(from).join(to), JSON.stringify(s));
    return JSON.parse(json) as AppData;
  };

  // Die Darstellung übersteht Zurücksetzen und Startstand. Der erste Test stellt sie auf dunkel.
  afterEach(() => act(() => useAppStore.getState().setAppearance('system')));

  test.each(['haendler', 'versicherung'] as const)(
    'jedes Laden ergibt denselben Stand, egal was vorher war (%s)',
    (kind) => {
      const { caseId } = goldenCase();
      const s = useAppStore.getState();
      s.reportClaim(caseId);
      s.setDemo({ claimScenario: 'ablehnen', deductible: 5000, hints: false });
      s.setAppearance('dunkel');
      s.loadDemoStart(kind);
      const afterCase = data();

      useAppStore.getState().reset();
      useAppStore.getState().loadDemoStart(kind);
      expect(data()).toEqual(afterCase);
      expect(afterCase).toEqual({ ...demoStartData(initialData, kind), appearance: 'dunkel' });
    },
  );

  test('ohne Angabe lädt der Store den Startstand mit dem Händler', () => {
    goldenCase();
    useAppStore.getState().loadDemoStart();
    expect(data()).toEqual(demoStartData(initialData, 'haendler'));
    expect(demoStartData(initialData)).toEqual(demoStartData(initialData, 'haendler'));
  });

  test('Demo-Startstand: Fründ, keine Versicherung, Kaufdatum im Beispielwert', () => {
    goldenCase();
    useAppStore.getState().loadDemoStart();
    const s = data();
    const ids = DEMO_START_IDS;

    expect(s.onboardingDone).toBe(true);
    expect(s.appearance).toBe('system');
    expect(s.demo).toEqual(defaultDemoSettings);
    expect(s.notifications).toBe('offen');
    expect(s.nextCaseNumber).toBe(demoConfig.caseNumber.start);
    expect(s.persons).toEqual([
      {
        id: ids.person,
        displayName: demoConfig.household.displayName,
        role: 'versicherungsnehmer',
      },
    ]);
    expect(s.household).toMatchObject({ id: ids.household, members: s.persons });

    // Keine Versicherung: kein Vertrag, das Gerät hängt an keinem
    expect(s.contracts).toEqual([]);
    expect(s.devices).toEqual([
      {
        id: ids.device,
        householdId: ids.household,
        manufacturerId: fruendModel.manufacturerId,
        category: fruendModel.category,
        model: fruendModel.model,
        identifiedBy: 'katalog',
        soldBy: { id: dealer.id, kind: 'haendler', name: dealer.name },
        purchaseDate: demoConfig.dealerDemo.purchaseDate,
        createdAt: demoConfig.demo.startAt,
      },
    ]);
    expect(dealer.id).toBe('fruend');
    expect(fruendModel.model).toBe('G 5833 SC');

    // Das Kaufdatum ist ein Beispielwert wie alle Werte der Demo-Konfiguration. Das Portal zeigt
    // die Akte darum als Beispiel. Es liegt weniger als 24 Monate vor dem Startstand.
    expect(demoConfig.isExample).toBe(true);
    expect(demoConfig.dealerDemo).not.toHaveProperty('isExample');
    const months = monthsBetween(demoConfig.dealerDemo.purchaseDate, demoConfig.demo.startAt);
    expect(months).toBeGreaterThanOrEqual(0);
    expect(months).toBeLessThan(24);

    expect(s.cases).toEqual({});
    expect(s.guideRuns).toEqual({});
    for (const list of [
      s.events,
      s.photos,
      s.diagnoses,
      s.consents,
      s.quotes,
      s.bookings,
      s.videoSessions,
      s.chatMessages,
    ]) {
      expect(list).toEqual([]);
    }
    // Ein gültiger gespeicherter Stand: nach einem Neustart lädt er ohne Hinweis.
    expect(() => parseStoredState(s)).not.toThrow();
  });

  // Die Prüfung im Portal rechnet ab dem Anlegen des Falls, also mit dem echten Tag und nicht mit
  // demo.startAt. Darum hier die echte Uhr: Der Test wird 60 Tage vor dem Wechsel auf „Kulanz“ rot.
  test('Kaufdatum im Startstand: Das Portal schlägt in 60 Tagen noch „Gewährleistung“ vor, sonst dealerDemo.purchaseDate in config/demo.config.ts nach vorn setzen', () => {
    const now = jest.getRealSystemTime();
    const base = seedRecords(now)[0]!.file;
    const file = {
      ...base,
      case: { ...base.case, createdAt: new Date(now + 60 * 86_400_000).toISOString() },
      device: { ...base.device, purchaseDate: demoStartData(initialData).devices[0]!.purchaseDate },
      quote: undefined,
      protection: undefined,
    };
    expect(warrantyCheck(file, fruendSettings.rules).verdict).toBe('gewaehrleistung');
  });

  test('gleicht dem Stand nach dem Onboarding mit Fründ (Entscheidung 31), bis auf das Kaufdatum', async () => {
    useAppStore.getState().reset();
    const r = await renderRouter(APP, { initialUrl: '/' });
    await tap(de.onboarding.start);
    await fireEvent.changeText(
      screen.getByPlaceholderText(de.setup.searchPlaceholder),
      fruendModel.model,
    );
    await tap(new RegExp(`^${deviceTitle(fruendModel)}`));
    expect(screen.getByRole('header', { name: de.setup.dealerTitle })).toBeTruthy();
    await fireEvent.press(screen.getByRole('radio', { name: new RegExp(`^${dealer.name}`) }));
    await tap(de.setup.saveDealer);
    expect(screen.getByRole('header', { name: de.setup.coverageTitle })).toBeTruthy();
    await tap(de.setup.notInsured);
    await act(async () => {});
    expect(r.getPathname()).toBe('/');

    const s = data();
    const fromOnboarding = withStartIds(s, [s.household!.createdAt, s.devices[0]!.createdAt]);
    // Nach dem Kaufdatum fragt das Onboarding nicht. Im Startstand ist es ein Beispielwert.
    const start = demoStartData(initialData);
    const device = { ...start.devices[0]! };
    delete device.purchaseDate;
    expect(fromOnboarding).toEqual({ ...start, devices: [device] });
  });

  test('Demo-Startstand Versicherung: Schutz verknüpft, das Gerät aus dem Vertrag, kein Fall', () => {
    goldenCase();
    useAppStore.getState().loadDemoStart('versicherung');
    const s = data();
    const ids = DEMO_START_IDS;

    expect(s.onboardingDone).toBe(true);
    expect(s.appearance).toBe('system');
    expect(s.demo).toEqual(defaultDemoSettings);
    expect(s.notifications).toBe('offen');
    expect(s.nextCaseNumber).toBe(demoConfig.caseNumber.start);

    expect(s.persons).toEqual([
      {
        id: ids.person,
        displayName: demoConfig.household.displayName,
        role: 'versicherungsnehmer',
      },
    ]);
    expect(s.household).toMatchObject({ id: ids.household, members: s.persons });
    expect(s.contracts).toHaveLength(1);
    expect(s.contracts[0]).toMatchObject({
      id: ids.contract,
      householdId: ids.household,
      policyholderId: ids.person,
      provider: { name: demoConfig.insurer.name },
      contractNumber: demoConfig.contract.number,
      deductible: demoConfig.contract.deductible,
      linkedVia: 'vertragsnummer',
      coveredDeviceIds: [ids.device],
    });
    expect(s.devices).toHaveLength(1);
    expect(s.devices[0]).toMatchObject({
      id: ids.device,
      householdId: ids.household,
      manufacturerId: demoConfig.manufacturer.id,
      category: demoConfig.device.category,
      model: demoConfig.device.model,
      contractId: ids.contract,
      identifiedBy: 'vertrag',
    });
    expect(s.devices[0]!.soldBy).toBeUndefined();

    expect(s.cases).toEqual({});
    expect(s.guideRuns).toEqual({});
    for (const list of [
      s.events,
      s.photos,
      s.diagnoses,
      s.consents,
      s.quotes,
      s.bookings,
      s.videoSessions,
      s.chatMessages,
    ]) {
      expect(list).toEqual([]);
    }
    // Ein gültiger gespeicherter Stand: nach einem Neustart lädt er ohne Hinweis.
    expect(() => parseStoredState(s)).not.toThrow();
  });

  test('Demo-Startstand Versicherung gleicht dem Stand nach dem Onboarding der ganz-Linie', async () => {
    useAppStore.getState().reset();
    const r = await renderRouter(APP, { initialUrl: '/schutz' });
    await fireEvent.changeText(
      screen.getByPlaceholderText(de.common.example(demoConfig.contract.number)),
      demoConfig.contract.number,
    );
    await fireEvent.press(screen.getByRole('button', { name: de.onboarding.link }));
    await act(async () => {});
    await fireEvent.press(screen.getByRole('button', { name: de.onboarding.confirmYes }));
    expect(r.getPathname()).toBe('/');

    // IDs und Zeiten sind im Startstand fest, sonst muss alles gleich sein.
    const s = data();
    const fromOnboarding = withStartIds(s, [
      s.household!.createdAt,
      s.contracts[0]!.linkedAt,
      s.devices[0]!.createdAt,
    ]);
    expect(fromOnboarding).toEqual(demoStartData(initialData, 'versicherung'));
  });

  test('„Demo-Startstand laden“ in der Demo-Steuerung führt zur Startseite, mit dem Gerät von Fründ', async () => {
    const { caseId } = goldenCase();
    const r = await openDemoControl();
    expect(
      screen.getByRole('button', { name: de.demoControl.demoStart }).props.accessibilityHint,
    ).toBe(de.demoControl.demoStartHint(dealer.name));
    await tap(de.demoControl.demoStart);
    await act(async () => {});

    expect(r.getPathname()).toBe('/');
    expect(screen.getByRole('header', { name: de.home.myDevices })).toBeTruthy();
    expect(screen.getByText(deviceTitle(fruendModel))).toBeTruthy();
    expect(screen.queryByText(de.demoControl.title)).toBeNull();
    expect(useAppStore.getState().cases[caseId]).toBeUndefined();
    expect(data()).toEqual(demoStartData(initialData, 'haendler'));
  });

  test('„Demo-Startstand Versicherung“ in der Demo-Steuerung führt zur Startseite', async () => {
    const { caseId } = goldenCase();
    const r = await openDemoControl();
    await tap(de.demoControl.demoStartInsurance);
    await act(async () => {});

    expect(r.getPathname()).toBe('/');
    expect(screen.getByRole('header', { name: de.home.myDevices })).toBeTruthy();
    const device = { manufacturerId: demoConfig.manufacturer.id, model: demoConfig.device.model };
    expect(screen.getByText(deviceTitle(device))).toBeTruthy();
    expect(screen.queryByText(de.demoControl.title)).toBeNull();
    expect(useAppStore.getState().cases[caseId]).toBeUndefined();
    expect(data()).toEqual(demoStartData(initialData, 'versicherung'));
  });

  test('nach „Demo-Startstand laden“ bietet ein Fall mit „Geht nicht“ „Fall an Fründ senden“ an', async () => {
    goldenCase();
    const r = await openDemoControl();
    await tap(de.demoControl.demoStart);
    await act(async () => {});
    expect(r.getPathname()).toBe('/');

    await tap(new RegExp(`^${de.home.searchTitle}`));
    const problem = fruendModel.problems![0]!;
    await tap(new RegExp(`^${problem.label}`));
    await act(async () => {});
    const c = Object.values(useAppStore.getState().cases)[0]!;
    expect(c.id).toBe(`${demoConfig.caseNumber.prefix}${demoConfig.caseNumber.start}`);
    expect(r.getPathname()).toBe(`/fall/${c.id}`);

    await tap(de.guide.notWorking);
    await tap(de.guide.getHelp);
    await act(async () => {});
    // Das Angebot nennt den Händler aus dem Startstand, noch ist nichts gesendet
    expect(
      screen.getByRole('button', { name: new RegExp(`^${de.sharing.offer(dealer.name)}`) }),
    ).toBeTruthy();
    expect(useAppStore.getState().consents.some((k) => k.purpose === 'weitergabe_haendler')).toBe(
      false,
    );
  });
});
