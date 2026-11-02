import { Linking } from 'react-native';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { openAll } from '../test/sections';
import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';
import { useAppStore } from '@/store/appStore';

const APP = './app';
const cameraMock = jest.requireMock('expo-camera').__permission;

beforeEach(() => {
  useAppStore.getState().reset();
  cameraMock.current = { granted: true, canAskAgain: true, status: 'granted' };
});

const flush = () => act(async () => {});

describe('Schutz verknüpfen', () => {
  test('die Vertragsnummer aus der Konfiguration verknüpft den Schutz', async () => {
    const r = await renderRouter(APP, { initialUrl: '/schutz' });
    await fireEvent.changeText(
      screen.getByPlaceholderText(de.common.example(demoConfig.contract.number)),
      demoConfig.contract.number.toLowerCase(),
    );
    await fireEvent.press(screen.getByRole('button', { name: de.onboarding.link }));
    await flush();
    expect(r.getPathname()).toBe('/geraet-bestaetigen');
    const contract = useAppStore.getState().contracts[0];
    expect(contract?.provider.name).toBe(demoConfig.insurer.name);
    expect(contract?.linkedVia).toBe('vertragsnummer');
    expect(screen.getByText(de.onboarding.confirmTitle)).toBeTruthy();
  });

  test('eine falsche Nummer zeigt einen Fehler', async () => {
    const r = await renderRouter(APP, { initialUrl: '/schutz' });
    await fireEvent.changeText(
      screen.getByPlaceholderText(de.common.example(demoConfig.contract.number)),
      'KV-0000',
    );
    await fireEvent.press(screen.getByRole('button', { name: de.onboarding.link }));
    await flush();
    expect(r.getPathname()).toBe('/schutz');
    expect(screen.getByText(de.onboarding.unknown.vertragsnummer)).toBeTruthy();
    expect(useAppStore.getState().contracts).toHaveLength(0);
  });

  test('der Händler-Code verknüpft ebenfalls', async () => {
    await renderRouter(APP, { initialUrl: '/schutz' });
    await fireEvent.press(screen.getByRole('radio', { name: de.onboarding.via.haendler_code }));
    await fireEvent.changeText(
      screen.getByPlaceholderText(de.common.example(demoConfig.dealer.code)),
      demoConfig.dealer.code,
    );
    await fireEvent.press(screen.getByRole('button', { name: de.onboarding.link }));
    await flush();
    expect(useAppStore.getState().contracts[0]?.linkedVia).toBe('haendler_code');
  });

  test('„Ja, das ist es“ legt das Gerät mit Vertrag an und öffnet die Tabs', async () => {
    useAppStore.getState().linkContract('vertragsnummer');
    const r = await renderRouter(APP, { initialUrl: '/geraet-bestaetigen' });
    await fireEvent.press(screen.getByRole('button', { name: de.onboarding.confirmYes }));
    const s = useAppStore.getState();
    expect(s.onboardingDone).toBe(true);
    expect(s.devices[0]?.contractId).toBe(s.contracts[0]?.id);
    expect(s.contracts[0]?.coveredDeviceIds).toEqual([s.devices[0]?.id]);
    expect(r.getPathname()).toBe('/');
  });
});

describe('Gerät hinzufügen', () => {
  beforeEach(() => useAppStore.setState({ onboardingDone: true }));

  test('der Scan lässt sich korrigieren', async () => {
    const r = await renderRouter(APP, { initialUrl: '/geraet/neu' });
    await fireEvent.press(screen.getByRole('button', { name: de.setup.scan }));
    await fireEvent.press(screen.getByRole('button', { name: de.scan.takePhoto }));
    await fireEvent.press(screen.getByRole('button', { name: de.camera.shutter }));
    await flush();
    expect(screen.getByText(de.scan.recognized)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: de.scan.edit }));
    await fireEvent.changeText(screen.getByLabelText(de.scan.model), 'WKB 140');
    await fireEvent.press(screen.getByRole('button', { name: de.scan.save }));
    const device = useAppStore.getState().devices[0];
    expect(device?.model).toBe('WKB 140');
    expect(device?.identifiedBy).toBe('typenschild_scan');
    expect(device?.materialNumber).toBe(demoConfig.device.typePlate.materialNumber);
    // Danach: wo gekauft, dann zusätzlich eine Versicherung?
    expect(screen.getByText(de.setup.dealerTitle)).toBeTruthy();
    await fireEvent.press(
      screen.getByRole('radio', { name: new RegExp(`^${de.setup.dealerUnknown}`) }),
    );
    await fireEvent.press(screen.getByRole('button', { name: de.setup.saveDealer }));
    expect(screen.getByText(de.setup.coverageTitle)).toBeTruthy();
    await fireEvent.press(
      screen.getByRole('button', { name: new RegExp(`^${de.setup.notInsured}`) }),
    );
    expect(r.getPathname()).toBe(`/geraet/${device?.id}`);
  });

  test('nicht erkannt: Hinweis und manuelle Eingabe', async () => {
    useAppStore.getState().setDemo({ scanScenario: 'nicht_erkannt' });
    await renderRouter(APP, { initialUrl: '/geraet/neu' });
    await fireEvent.press(screen.getByRole('button', { name: de.setup.scan }));
    await fireEvent.press(screen.getByRole('button', { name: de.scan.takePhoto }));
    await fireEvent.press(screen.getByRole('button', { name: de.camera.shutter }));
    await flush();
    expect(screen.getByText(de.scan.notRecognizedTitle)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: de.scan.manual }));
    await fireEvent.press(screen.getByRole('button', { name: de.scan.save }));
    expect(screen.getByText(de.scan.modelRequired)).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText(de.scan.model), 'G 7000');
    await fireEvent.press(screen.getByRole('radio', { name: de.deviceCategory.geschirrspueler }));
    await fireEvent.press(screen.getByRole('button', { name: de.scan.save }));
    expect(useAppStore.getState().devices[0]).toMatchObject({
      model: 'G 7000',
      category: 'geschirrspueler',
      identifiedBy: 'manuell',
    });
  });

  test('Kamera abgelehnt: Hinweis und Weg in die Einstellungen', async () => {
    cameraMock.current = { granted: false, canAskAgain: false, status: 'denied' };
    const spy = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    await renderRouter(APP, { initialUrl: '/geraet/neu' });
    await fireEvent.press(screen.getByRole('button', { name: de.setup.scan }));
    await fireEvent.press(screen.getByRole('button', { name: de.scan.takePhoto }));
    expect(screen.getByText(de.camera.deniedTitle)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: de.camera.openSettings }));
    expect(spy).toHaveBeenCalled();
  });

  test('vor der ersten Frage erklärt die App, wofür sie die Kamera braucht', async () => {
    cameraMock.current = { granted: false, canAskAgain: true, status: 'undetermined' };
    await renderRouter(APP, { initialUrl: '/geraet/neu' });
    await fireEvent.press(screen.getByRole('button', { name: de.setup.scan }));
    await fireEvent.press(screen.getByRole('button', { name: de.scan.takePhoto }));
    expect(screen.getByText(de.camera.permissionTitle)).toBeTruthy();
    expect(screen.getByRole('button', { name: de.camera.allow })).toBeTruthy();
  });
});

describe('Gerätedetail', () => {
  test('die Kundendienst-Nummer kommt aus den Gerätedaten', async () => {
    useAppStore.setState({ onboardingDone: true });
    const device = useAppStore.getState().addDevice({
      manufacturerId: demoConfig.manufacturer.id,
      category: 'waschmaschine',
      model: 'WKB 130',
      identifiedBy: 'vertrag',
    });
    const original = demoConfig.manufacturer.serviceContact.phone;
    (demoConfig.manufacturer.serviceContact as { phone: string }).phone = '0800 11 22 333';
    const spy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await renderRouter(APP, { initialUrl: `/geraet/${device.id}` });
    await openAll();
    // Die Zeile mit der Nummer, nicht der Abschnittskopf „Kundendienst“
    const row = screen.getByRole('button', { name: /0800 11 22 333/ });
    expect(screen.getByText(/0800 11 22 333/)).toBeTruthy();
    await fireEvent.press(row);
    expect(spy).toHaveBeenCalledWith('tel:08001122333');
    (demoConfig.manufacturer.serviceContact as { phone: string }).phone = original;
  });

  test('ohne Schutz: Hinweis und Weg zum Verknüpfen', async () => {
    useAppStore.setState({ onboardingDone: true });
    const device = useAppStore.getState().addDevice({
      manufacturerId: demoConfig.manufacturer.id,
      category: 'waschmaschine',
      model: 'WKB 130',
      identifiedBy: 'manuell',
    });
    await renderRouter(APP, { initialUrl: `/geraet/${device.id}` });
    await openAll();
    expect(screen.getByText(de.device.noProtection)).toBeTruthy();
    expect(screen.getByText(de.coverage.dealerUnknown)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: de.coverage.change }));
    expect(screen.getByText(de.setup.coverageTitle)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${de.setup.insured}`) }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Lerche Versicherung' }));
    await fireEvent.changeText(screen.getByLabelText(de.setup.policyLabel), 'LV-123456');
    await fireEvent.press(screen.getByRole('button', { name: de.setup.savePolicy }));
    const s = useAppStore.getState();
    expect(s.devices[0]?.contractId).toBe(s.contracts[0]?.id);
    expect(s.contracts[0]).toMatchObject({
      contractNumber: 'LV-123456',
      provider: { name: 'Lerche Versicherung' },
    });
  });
});

describe('Gerät anlegen: erst Händler, dann Versicherung (Entscheidung 16, 31)', () => {
  test('Onboarding: Gerät aus dem Katalog suchen, Händler wählen, ohne Versicherung fertig', async () => {
    const r = await renderRouter(APP, { initialUrl: '/geraet-anlegen' });
    await fireEvent.changeText(screen.getByLabelText(de.setup.searchLabel), 'g5833');
    expect(screen.queryByRole('button', { name: /Bosch SMI4EAS24E/ })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: /^Miele G 5833 SC/ }));
    // Zuerst: Wo gekauft?
    expect(screen.getByText(de.setup.dealerTitle)).toBeTruthy();
    // Ohne Auswahl kein Weiter
    await fireEvent.press(screen.getByRole('button', { name: de.setup.saveDealer }));
    expect(screen.getByText(de.setup.pickDealerFirst)).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText(de.setup.dealerSearch), 'löhne');
    expect(screen.queryByRole('radio', { name: /^Elektro Lindemann/ })).toBeNull();
    await fireEvent.press(screen.getByRole('radio', { name: /^Fründ Elektrogeräte AG/ }));
    await fireEvent.press(screen.getByRole('button', { name: de.setup.saveDealer }));
    // Dann: zusätzlich eine Versicherung?
    expect(screen.getByText(de.setup.coverageTitle)).toBeTruthy();
    await fireEvent.press(
      screen.getByRole('button', { name: new RegExp(`^${de.setup.notInsured}`) }),
    );
    const s = useAppStore.getState();
    expect(s.onboardingDone).toBe(true);
    expect(s.contracts).toHaveLength(0);
    expect(s.devices[0]).toMatchObject({
      manufacturerId: 'miele',
      model: 'G 5833 SC',
      category: 'geschirrspueler',
      identifiedBy: 'katalog',
      soldBy: { id: 'fruend', kind: 'haendler' },
    });
    expect(r.getPathname()).toBe('/');
  });

  test('mit Versicherung: der Händler bleibt, dazu Versicherer und Police-Nr.', async () => {
    await renderRouter(APP, { initialUrl: '/geraet-anlegen' });
    await fireEvent.press(screen.getByRole('button', { name: /^Bosch SMI4EAS24E/ }));
    await fireEvent.press(screen.getByRole('radio', { name: /^Elektro Lindemann/ }));
    await fireEvent.press(screen.getByRole('button', { name: de.setup.saveDealer }));
    await fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${de.setup.insured}`) }));
    await fireEvent.changeText(screen.getByLabelText(de.setup.insurerSearch), 'kran');
    expect(screen.queryByRole('radio', { name: 'Lerche Versicherung' })).toBeNull();
    await fireEvent.press(screen.getByRole('radio', { name: 'Kranich Versicherung' }));
    await fireEvent.press(screen.getByRole('button', { name: de.setup.savePolicy }));
    expect(screen.getByText(de.setup.policyEmpty)).toBeTruthy();
    await fireEvent.changeText(
      screen.getByLabelText(de.setup.policyLabel),
      demoConfig.contract.number,
    );
    await fireEvent.press(screen.getByRole('button', { name: de.setup.savePolicy }));
    const s = useAppStore.getState();
    expect(s.devices[0]?.contractId).toBe(s.contracts[0]?.id);
    expect(s.devices[0]?.soldBy).toMatchObject({ id: 'lindemann' });
    expect(s.contracts[0]?.provider.name).toBe(demoConfig.insurer.name);
  });
});
