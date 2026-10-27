import * as fs from 'fs';
import * as path from 'path';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';
import { useAppStore } from '@/store/appStore';

const APP = './app';
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

    await fireEvent.press(screen.getByRole('checkbox', { name: de.demoControl.hints }));
    expect(useAppStore.getState().demo.hints).toBe(false);
  });

  test('„Offene Fälle einen Schritt weiter“ schaltet den Status', async () => {
    const { caseId } = goldenCase();
    useAppStore.getState().reportClaim(caseId, '1');
    await renderRouter(APP, { initialUrl: '/profil' });
    const version = screen.getByText(/^Version/);
    for (let i = 0; i < 7; i++) await fireEvent.press(version);
    await tap(de.demoControl.advance);
    await act(async () => {});
    expect(useAppStore.getState().cases[caseId]?.status).toBe('freigegeben');
    expect(screen.getByText(de.demoControl.advanced(1))).toBeTruthy();
  });
});
