// Telefon-App und Einstellungen: Geht das Öffnen nicht, kommt ein ruhiger Hinweis statt eines
// Absturzes (Schritt 24).
import * as Notifications from 'expo-notifications';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { Linking, Platform } from 'react-native';

import { demoConfig } from '@/config/demo.config';
import { portalLogin } from '@/config/portal.demo';
import { de } from '@/i18n/de';
import { openMail, openPhone, openSystemSettings } from '@/lib/linking';
import { useAppStore } from '@/store/appStore';
import { APP } from '@/test/app';
import { addWasher, flush, start } from '@/test/regressions';
import { openAll } from '@/test/sections';

const service = demoConfig.manufacturer.serviceContact;
const failed = de.common.phoneFailed(service.phone);

// Im Web fehlt Linking.openSettings. jest.replaceProperty ersetzt keine Funktion, darum von Hand.
const openSettings = Linking.openSettings;
const dropOpenSettings = () => Object.assign(Linking, { openSettings: undefined });
afterEach(() => {
  Object.assign(Linking, { openSettings });
});

describe('Telefon-App', () => {
  test('öffnet die Nummer ohne Leerzeichen', async () => {
    jest.mocked(Linking.openURL).mockResolvedValueOnce(undefined);
    await expect(openPhone(service.phone)).resolves.toBe(true);
    expect(Linking.openURL).toHaveBeenLastCalledWith(`tel:${service.phone.replace(/\s/g, '')}`);
  });

  test('Gerätedetail: lässt sich die Telefon-App nicht öffnen, steht die Nummer im Hinweis', async () => {
    start();
    const device = addWasher();
    await renderRouter(APP, { initialUrl: `/geraet/${device.id}` });
    await openAll();
    jest.mocked(Linking.openURL).mockRejectedValueOnce(new Error('Keine App für tel:'));
    await fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${service.label}`) }));
    await flush();
    expect(screen.getByText(failed)).toBeTruthy();
    expect(failed).not.toMatch(/!/);
  });

  test('Gespräch: der Kundendienst bekommt denselben Hinweis', async () => {
    start();
    const device = addWasher();
    const c = useAppStore
      .getState()
      .createCase({ deviceId: device.id, entry: 'foto', problemLabel: 'Wasserablauf gestört' });
    useAppStore.getState().escalate(c.id);
    await renderRouter(APP, { initialUrl: `/fall/${c.id}` });
    jest.mocked(Linking.openURL).mockRejectedValueOnce(new Error('Keine App für tel:'));
    await fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${service.label}`) }));
    await flush();
    expect(screen.getByText(failed)).toBeTruthy();
  });
});

describe('Mail-App (Kontaktkarte des Händlers)', () => {
  test('öffnet die Adresse, scheitert das Öffnen, liefert es false statt zu werfen', async () => {
    const email = portalLogin.email;
    jest.mocked(Linking.openURL).mockResolvedValueOnce(undefined);
    await expect(openMail(email)).resolves.toBe(true);
    expect(Linking.openURL).toHaveBeenLastCalledWith(`mailto:${email}`);
    jest.mocked(Linking.openURL).mockRejectedValueOnce(new Error('Keine App für mailto:'));
    await expect(openMail(email)).resolves.toBe(false);
    expect(de.common.mailFailed(email)).not.toMatch(/!/);
  });
});

describe('Einstellungen des Telefons', () => {
  test('im Web gibt es sie nicht, ohne Linking.openSettings auch nicht', async () => {
    const os = jest.replaceProperty(Platform, 'OS', 'web');
    await expect(openSystemSettings()).resolves.toBe(false);
    os.restore();
    dropOpenSettings();
    await expect(openSystemSettings()).resolves.toBe(false);
  });

  test('scheitert das Öffnen, liefert es false statt zu werfen', async () => {
    jest.mocked(Linking.openSettings).mockRejectedValueOnce(new Error('nicht da'));
    await expect(openSystemSettings()).resolves.toBe(false);
  });

  test('Profil: Mitteilungen ausgeschaltet und keine Einstellungen, dann ein ruhiger Hinweis', async () => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValueOnce({
      granted: false,
      canAskAgain: false,
    } as Awaited<ReturnType<typeof Notifications.getPermissionsAsync>>);
    dropOpenSettings();
    start();
    await renderRouter(APP, { initialUrl: '/profil' });
    await openAll();
    const box = screen.getByRole('checkbox', { name: de.profile.notifications });
    await fireEvent.press(box);
    await act(async () => {});
    expect(screen.getByText(de.profile.notificationsSettings)).toBeTruthy();
    expect(box).not.toBeChecked();
    expect(useAppStore.getState().consents.filter((c) => c.purpose === 'mitteilungen')).toEqual([]);
  });
});
