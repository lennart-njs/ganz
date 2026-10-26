import { Linking } from 'react-native';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { de } from '@/i18n/de';
import { services } from '@/services';
import { useAppStore } from '@/store/appStore';

const APP = './app';
const cameraMock = jest.requireMock('expo-camera').__permission;
let taps = 0;
const tap = async (name: string | RegExp) => {
  taps += 1;
  await fireEvent.press(screen.getByRole('button', { name }));
};
const flush = async () => {
  for (let i = 0; i < 10; i++) await act(async () => {});
};

beforeEach(() => {
  taps = 0;
  cameraMock.current = { granted: true, canAskAgain: true, status: 'granted' };
  useAppStore.getState().reset();
  useAppStore.setState({ onboardingDone: true });
  useAppStore.getState().linkContract('vertragsnummer');
  useAppStore.getState().addDevice({
    manufacturerId: 'miele',
    category: 'waschmaschine',
    model: 'WKB 130',
    identifiedBy: 'vertrag',
    contractId: useAppStore.getState().contracts[0]!.id,
  });
});

async function photoFlow(mode: 'display' | 'typenschild' | 'bauteil' = 'display') {
  const r = await renderRouter(APP, { initialUrl: '/' });
  await tap(new RegExp(`^${de.home.searchTitle}`));
  await tap(new RegExp(`^${de.problem.photo}`));
  if (mode !== 'display') {
    await fireEvent.press(screen.getByRole('radio', { name: de.camera.modes[mode] }));
  }
  await tap(de.camera.shutter);
  await flush();
  return r;
}

describe('Mock der Fehlererkennung', () => {
  test('die drei Modi liefern verschiedene Ergebnisse', async () => {
    const display = await services.diagnosis.analyze({ mode: 'display', scenario: 'standard' });
    const bauteil = await services.diagnosis.analyze({ mode: 'bauteil', scenario: 'standard' });
    const typenschild = await services.diagnosis.analyze({
      mode: 'typenschild',
      scenario: 'standard',
    });
    expect(display).toMatchObject({ errorPattern: 'wasserablauf', confidence: 'hoch' });
    expect(bauteil).toMatchObject({ errorPattern: 'laugenpumpe_blockiert', confidence: 'mittel' });
    expect(typenschild).toEqual({ kind: 'geraet' });
  });

  test('Szenarien „unsicher“ und „unscharf“', async () => {
    expect(await services.diagnosis.analyze({ mode: 'display', scenario: 'unsicher' })).toEqual({
      kind: 'rueckfrage',
      question: 'wasser',
    });
    expect(await services.diagnosis.analyze({ mode: 'bauteil', scenario: 'unscharf' })).toEqual({
      kind: 'fehler',
      reason: 'unscharf',
    });
  });
});

describe('Foto → Ergebnis', () => {
  test('Display: Laugenfilter, Sicherheit hoch, 4 Taps bis zum ersten Schritt', async () => {
    const r = await photoFlow('display');
    expect(r.getPathname()).toBe('/fall/GS-24817/ergebnis');
    expect(screen.getByText(de.result.headline.wasserablauf)).toBeTruthy();
    expect(screen.getByText(de.ds.confidenceLabel('hoch'))).toBeTruthy();
    await tap(de.result.startGuide);
    expect(taps).toBe(4);
    expect(r.getPathname()).toBe('/fall/GS-24817/anleitung');
  });

  test('Bauteil: Laugenpumpe, Sicherheit mittel', async () => {
    await photoFlow('bauteil');
    expect(screen.getByText(de.result.headline.laugenpumpe_blockiert)).toBeTruthy();
    expect(screen.getByText(de.ds.confidenceLabel('mittel'))).toBeTruthy();
  });

  test('Typenschild: Gerät erkannt, keine Diagnose', async () => {
    await photoFlow('typenschild');
    expect(screen.getByText(de.result.deviceTitle)).toBeTruthy();
    expect(screen.queryByText(de.result.headline.wasserablauf)).toBeNull();
  });

  test('jedes Foto hat Zeitstempel, Gerät, Zweck und Fall', async () => {
    await photoFlow('bauteil');
    const s = useAppStore.getState();
    const photo = s.photos[0]!;
    expect(photo).toMatchObject({
      caseId: 'GS-24817',
      deviceId: s.devices[0]!.id,
      purpose: 'bauteil',
      source: 'in_app_camera',
      uri: 'file:///test.jpg',
    });
    expect(new Date(photo.takenAt).toString()).not.toBe('Invalid Date');
    expect(s.events.find((e) => e.type === 'foto_aufgenommen')?.payload.photoId).toBe(photo.id);
  });

  test('„unsicher“ zeigt die Rückfrage, die Antwort wählt die Anleitung', async () => {
    useAppStore.getState().setDemo({ diagnosisScenario: 'unsicher' });
    const r = await photoFlow('display');
    expect(r.getPathname()).toBe('/fall/GS-24817/rueckfrage');
    await fireEvent.press(screen.getByRole('radio', { name: de.question.answers.zulauf }));
    await tap(de.question.next);
    expect(r.getPathname()).toBe('/fall/GS-24817/ergebnis');
    expect(screen.getByText(de.result.headline.wasserzulauf)).toBeTruthy();
    expect(useAppStore.getState().diagnoses.at(-1)?.guideId).toBe('zulauf');
  });

  test('„Weiß ich nicht“ führt zu „Hilfe holen“', async () => {
    useAppStore.getState().setDemo({ diagnosisScenario: 'unsicher' });
    const r = await photoFlow('display');
    await fireEvent.press(screen.getByRole('radio', { name: de.question.answers.unklar }));
    await tap(de.question.next);
    expect(r.getPathname()).toBe('/fall/GS-24817/hilfe');
    expect(useAppStore.getState().cases['GS-24817']?.status).toBe('eskaliert');
  });

  test('„unscharf“: Fehler und neues Foto', async () => {
    useAppStore.getState().setDemo({ diagnosisScenario: 'unscharf' });
    const r = await photoFlow('display');
    expect(screen.getByText(de.analysis.blurryTitle)).toBeTruthy();
    await tap(de.analysis.newPhoto);
    expect(r.getPathname()).toBe('/fall/GS-24817/kamera');
  });

  test('„Passt nicht“ führt zurück zu „Problem melden“', async () => {
    const r = await photoFlow('display');
    await tap(de.result.doesNotFit);
    expect(r.getPathname()).toBe('/fall/neu');
  });

  test('Kamera abgelehnt: Hinweis und Link zu den Einstellungen', async () => {
    cameraMock.current = { granted: false, canAskAgain: false, status: 'denied' };
    const spy = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    await renderRouter(APP, { initialUrl: '/' });
    await tap(new RegExp(`^${de.home.searchTitle}`));
    await tap(new RegExp(`^${de.problem.photo}`));
    expect(screen.getByText(de.camera.deniedTitle)).toBeTruthy();
    await tap(de.camera.openSettings);
    expect(spy).toHaveBeenCalled();
  });
});

describe('Kein Text sagt Kosten zu', () => {
  const forbidden =
    /übernimmt die Kosten(?! nicht)|kostet dich (das )?nichts|trägt alles|fallen keine Kosten|keine Kosten an|kostenlos repariert/i;

  function strings(value: unknown): string[] {
    if (typeof value === 'string') return [value];
    if (typeof value === 'function') {
      const out = (value as (...a: string[]) => unknown)('X', 'Y', 'Z');
      return typeof out === 'string' ? [out] : [];
    }
    if (value && typeof value === 'object') return Object.values(value).flatMap(strings);
    return [];
  }

  test('in i18n/de.ts steht keine Kostenzusage', () => {
    expect(strings(de).filter((s) => forbidden.test(s))).toEqual([]);
  });

  test('das Ergebnis nennt Prüfung und Selbstbeteiligung', async () => {
    await photoFlow('display');
    expect(screen.getByText(de.result.costNote('Kranich', '0 €'))).toBeTruthy();
  });
});
