import * as fs from 'fs';
import * as path from 'path';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { de } from '@/i18n/de';
import { appliance, findingPattern, hasGuides } from '@/lib/appliance';
import { statusView } from '@/lib/statusView';
import type { DeviceCategory } from '@/model/types';
import { services } from '@/services';
import { useAppStore } from '@/store/appStore';

const APP = './app';
const tap = (name: string | RegExp) => fireEvent.press(screen.getByRole('button', { name }));

function setup(category: DeviceCategory) {
  const s = useAppStore.getState();
  s.reset();
  useAppStore.setState({ onboardingDone: true });
  s.linkContract('vertragsnummer');
  return s.addDevice({
    manufacturerId: 'miele',
    category,
    model: 'G 7100',
    identifiedBy: 'manuell',
    contractId: useAppStore.getState().contracts[0]!.id,
  });
}

describe('Texte je Gerätetyp', () => {
  test('jeder Gerätetyp hat eigene Texte, nur die Waschmaschine hat Anleitungen', () => {
    const categories = Object.keys(de.appliance) as DeviceCategory[];
    expect(categories.sort()).toEqual(Object.keys(de.deviceCategory).sort());
    expect(categories.filter(hasGuides)).toEqual(['waschmaschine']);
    for (const c of categories.filter((x) => x !== 'waschmaschine')) {
      const a = appliance(c);
      expect(a.symptoms.length).toBeGreaterThan(3);
      // Kein Waschmaschinen-Wort in den Texten anderer Geräte
      expect(JSON.stringify(a)).not.toMatch(/Waschmaschine|Schauglas|die Maschine/);
      expect(findingPattern(c)).not.toBe('laugenpumpe_defekt');
    }
  });

  test('Geschirrspüler: eigene Symptome, keine Display-Meldungen, Symptom führt zu Hilfe', async () => {
    const device = setup('geschirrspueler');
    const r = await renderRouter(APP, { initialUrl: `/fall/neu?geraet=${device.id}` });
    const symptom = de.appliance.geschirrspueler.symptoms[0]!;
    expect(screen.getByText(symptom.label)).toBeTruthy();
    expect(screen.queryByText(de.problems[0]!.label)).toBeNull();
    expect(screen.queryByText(de.problems[1]!.label)).toBeNull();
    await tap(new RegExp(`^${symptom.label}`));
    const id = Object.keys(useAppStore.getState().cases)[0]!;
    expect(r.getPathname()).toBe(`/fall/${id}`);
    expect(useAppStore.getState().cases[id]).toMatchObject({
      entry: 'symptom',
      problemLabel: symptom.label,
    });
    expect(Object.keys(useAppStore.getState().guideRuns)).toHaveLength(0);
  });

  test('Gerätedetail ohne Pflege-Anleitungen für den Kühlschrank', async () => {
    const device = setup('kuehlschrank');
    await renderRouter(APP, { initialUrl: `/geraet/${device.id}` });
    expect(screen.queryByText(de.maintenance[0]!.title)).toBeNull();
    expect(screen.getByText(de.device.noGuides)).toBeTruthy();
  });

  test('Fehlererkennung erfindet für andere Geräte keine Anleitung', async () => {
    expect(
      await services.diagnosis.analyze({
        mode: 'display',
        scenario: 'standard',
        category: 'trockner',
      }),
    ).toEqual({ kind: 'ohne_anleitung' });
    expect(
      await services.diagnosis.analyze({
        mode: 'typenschild',
        scenario: 'standard',
        category: 'trockner',
      }),
    ).toEqual({ kind: 'geraet' });
  });

  test('Ergebnis ohne Anleitung bietet Hilfe an', async () => {
    const device = setup('trockner');
    const s = useAppStore.getState();
    const c = s.createCase({ deviceId: device.id, entry: 'foto', problemLabel: 'Foto' });
    s.addDiagnosis({
      caseId: c.id,
      photoIds: [],
      mode: 'display',
      errorPattern: 'ohne_anleitung',
      confidence: 'unsicher',
      confidenceScore: 0,
      source: 'fehlererkennung',
    });
    const r = await renderRouter(APP, { initialUrl: `/fall/${c.id}` });
    expect(screen.getByText(de.result.noGuideTitle)).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: new RegExp(`^${de.result.startGuide}`) }),
    ).toBeNull();
    await tap(de.result.getHelp);
    expect(r.getPathname()).toBe(`/fall/${c.id}`);
    expect(useAppStore.getState().cases[c.id]?.status).toBe('eskaliert');
  });

  test('Befund, Kostenvoranschlag und Status sprechen vom Kühlschrank', async () => {
    const device = setup('kuehlschrank');
    const s = useAppStore.getState();
    const c = s.createCase({ deviceId: device.id, entry: 'symptom', problemLabel: 'Kühlt nicht' });
    s.escalate(c.id);
    const k = de.appliance.kuehlschrank;
    useAppStore.getState().setFinding(c.id, 'reparatur', 'fachkraft');
    await renderRouter(APP, { initialUrl: `/fall/${c.id}` });
    expect(screen.getByText(k.finding.title)).toBeTruthy();
    expect(screen.getByText(k.finding.text)).toBeTruthy();
    expect(screen.queryByText(/Laugenpumpe/)).toBeNull();
    const st = useAppStore.getState();
    expect(st.quotes.find((q) => q.caseId === c.id)?.repair.partName).toBe(k.finding.component);
    expect(st.diagnoses.at(-1)).toMatchObject({
      errorPattern: 'kuehlschrank_teil_defekt',
      component: k.finding.component,
    });

    st.requestBooking({
      caseId: c.id,
      kind: 'reparatur',
      partnerId: 'brandt',
      slotLabel: 'Mo vormittags',
      selfPay: true,
      partName: k.finding.component,
    });
    const booking = useAppStore.getState().bookings.find((b) => b.caseId === c.id)!;
    useAppStore.setState((x) => ({
      bookings: x.bookings.map((b) => (b.id === booking.id ? { ...b, status: 'unterwegs' } : b)),
    }));
    expect(statusView(useAppStore.getState(), useAppStore.getState().cases[c.id]!).text).toBe(
      k.reachable,
    );
  });

  test('Screens nutzen keine festen Waschmaschinen-Texte', () => {
    const files = ['index', 'videocall', 'anleitung', 'kamera'].map((f) =>
      fs.readFileSync(path.join(__dirname, '..', 'app', 'fall', '[id]', `${f}.tsx`), 'utf8'),
    );
    for (const src of files) expect(src).not.toMatch(/Laugenpumpe|Maschine/);
  });
});
