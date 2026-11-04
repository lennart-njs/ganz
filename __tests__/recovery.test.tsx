import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import * as RN from 'react-native';
import { StyleSheet } from 'react-native';

import { de } from '@/i18n/de';
import { INSTALLATION_ID } from '@/lib/chat/protocol';
import { INSTALLATION_KEY, forgetInstallationId, installationId } from '@/services/installation';
import { initialData, useAppStore } from '@/store/appStore';
import { BACKUP_PREFIX, STORE_KEY, STORE_VERSION } from '@/store/persistence';
import { APP } from '@/test/app';
import { colors } from '@/theme/colors';

const t = de.recovery;
const tap = (name: string) => fireEvent.press(screen.getByRole('button', { name }));
const stored = (state: unknown, version = STORE_VERSION) => JSON.stringify({ state, version });

/** Legt den Speicher fest und lädt den Store der App neu, wie beim Start */
async function startWith(raw: string | null) {
  await AsyncStorage.clear();
  if (raw !== null) await AsyncStorage.setItem(STORE_KEY, raw);
  await act(async () => {
    await useAppStore.persist.rehydrate();
  });
}

const backupKeys = async () =>
  (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(BACKUP_PREFIX));

/** Hintergrundfarben aller gerenderten Views */
const backgrounds = () =>
  screen.container
    .queryAll((n) => n.type === 'View')
    .map((n) => StyleSheet.flatten(n.props.style)?.backgroundColor)
    .filter(Boolean);

afterEach(async () => {
  jest.restoreAllMocks();
  await startWith(null);
});

describe('Hinweis zum Wiederherstellen', () => {
  test('kaputter Speicher: der Hinweis statt des Splash-Screens, mit zwei Wegen', async () => {
    await startWith('{kaputt');
    expect(useAppStore.loading.getState().status).toBe('fehler');
    await renderRouter(APP, { initialUrl: '/' });
    expect(screen.getByRole('header', { name: t.title })).toBeTruthy();
    expect(screen.getByText(t.text)).toBeTruthy();
    expect(screen.getByRole('button', { name: t.retry })).toBeTruthy();
    expect(screen.getByRole('button', { name: t.reset })).toBeTruthy();
    expect(await backupKeys()).toHaveLength(1);
  });

  test('Erneut versuchen: bleibt der Speicher kaputt, bleibt der Hinweis und sagt es', async () => {
    const raw = stored({ ...initialData, cases: 5 });
    await startWith(raw);
    await renderRouter(APP, { initialUrl: '/' });
    await tap(t.retry);
    expect(await screen.findByText(t.retryFailed)).toBeTruthy();
    expect(screen.getByRole('button', { name: t.retry })).toBeEnabled();
    // Einmal gesichert, der Stand selbst bleibt unberührt
    expect(await backupKeys()).toHaveLength(1);
    expect(await AsyncStorage.getItem(STORE_KEY)).toBe(raw);
  });

  test('Erneut versuchen mit heilem Speicher öffnet die App mit dem gespeicherten Stand', async () => {
    await startWith('{kaputt');
    await renderRouter(APP, { initialUrl: '/' });
    await AsyncStorage.setItem(STORE_KEY, stored({ ...initialData, onboardingDone: true }));
    await tap(t.retry);
    expect(await screen.findByText(de.home.myDevices)).toBeTruthy();
    expect(screen.queryByText(t.title)).toBeNull();
    expect(useAppStore.getState().onboardingDone).toBe(true);
  });

  test('Zurücksetzen beginnt neu mit dem Onboarding, die Kopie des alten Stands bleibt', async () => {
    const raw = stored(initialData, 99);
    await startWith(raw);
    await renderRouter(APP, { initialUrl: '/' });
    await tap(t.reset);
    expect(await screen.findByText(de.onboarding.welcomeTitle)).toBeTruthy();
    expect(useAppStore.loading.getState().status).toBe('ok');
    const keys = await backupKeys();
    expect(keys).toHaveLength(1);
    expect(await AsyncStorage.getItem(keys[0]!)).toBe(raw);
    const fresh = JSON.parse((await AsyncStorage.getItem(STORE_KEY))!);
    expect(fresh.version).toBe(STORE_VERSION);
    expect(fresh.state).toMatchObject({ onboardingDone: false, cases: {}, devices: [] });
  });

  test('Zurücksetzen löscht auch die Installations-ID für den Assistenten', async () => {
    await startWith('{kaputt');
    // Die erste Frage an den Assistenten hat eine ID angelegt, im Speicher und im Gedächtnis
    forgetInstallationId();
    const before = await installationId();
    expect(before).toMatch(INSTALLATION_ID);
    expect(await AsyncStorage.getItem(INSTALLATION_KEY)).toBe(before);
    await renderRouter(APP, { initialUrl: '/' });
    await tap(t.reset);
    expect(await screen.findByText(de.onboarding.welcomeTitle)).toBeTruthy();
    expect(await AsyncStorage.getItem(INSTALLATION_KEY)).toBeNull();
    // Auch die gemerkte ID ist vergessen: Die nächste Frage legt eine neue an
    const next = await installationId();
    expect(next).toMatch(INSTALLATION_ID);
    expect(next).not.toBe(before);
  });

  test('Zurücksetzen wartet, bis die Installations-ID gelöscht ist, erst dann geht die App auf', async () => {
    await startWith('{kaputt');
    forgetInstallationId();
    const before = await installationId();
    expect(before).toMatch(INSTALLATION_ID);
    // Das Löschen der ID dauert ein paar Schritte länger als alles andere
    const removeItem = jest.mocked(AsyncStorage.removeItem);
    const remove = removeItem.getMockImplementation()!;
    removeItem.mockImplementation(async (key: string) => {
      if (key === INSTALLATION_KEY) for (let i = 0; i < 50; i++) await Promise.resolve();
      return remove(key);
    });
    // Was im Speicher steht, wenn die App den Stand neu lädt und wieder aufgeht
    const atReopen: (string | null)[] = [];
    const rehydrate = useAppStore.persist.rehydrate;
    jest.spyOn(useAppStore.persist, 'rehydrate').mockImplementation(async () => {
      atReopen.push(await AsyncStorage.getItem(INSTALLATION_KEY));
      return rehydrate();
    });
    try {
      await renderRouter(APP, { initialUrl: '/' });
      await tap(t.reset);
      expect(await screen.findByText(de.onboarding.welcomeTitle)).toBeTruthy();
      expect(atReopen).toEqual([null]);
    } finally {
      removeItem.mockImplementation(remove);
    }
  });

  test('Zurücksetzen löscht nichts, was es nicht sichern konnte', async () => {
    const raw = stored(initialData);
    // Beim Start und beim ersten Zurücksetzen lässt sich der Speicher nicht lesen
    const unreadable = new Error('Speicher nicht lesbar');
    jest
      .mocked(AsyncStorage.getItem)
      .mockRejectedValueOnce(unreadable)
      .mockRejectedValueOnce(unreadable);
    await startWith(raw);
    await renderRouter(APP, { initialUrl: '/' });
    await tap(t.reset);
    expect(await screen.findByText(t.resetFailed)).toBeTruthy();
    expect(await AsyncStorage.getItem(STORE_KEY)).toBe(raw);

    // Lässt sich der Stand wieder lesen, klappt es
    await tap(t.reset);
    expect(await screen.findByText(de.onboarding.welcomeTitle)).toBeTruthy();
    expect(await backupKeys()).toHaveLength(1);
  });

  test('dunkel und mit 200 % Schrift: Farben aus dem Theme, alles wächst mit, 44 pt', async () => {
    jest.spyOn(RN, 'useColorScheme').mockReturnValue('dark');
    jest
      .spyOn(RN, 'useWindowDimensions')
      .mockReturnValue({ width: 390, height: 844, scale: 3, fontScale: 2 });
    await startWith('{kaputt');
    await renderRouter(APP, { initialUrl: '/' });
    expect(backgrounds()[0]).toBe(colors.dark.bgPage);
    expect(screen.getByText(t.title)).toHaveStyle({ color: colors.dark.textStrong });

    const texts = screen.container.queryAll((n) => n.type === 'Text');
    expect(texts.length).toBeGreaterThan(4);
    for (const n of texts) {
      expect(n.props.allowFontScaling).not.toBe(false);
      expect(n.props.maxFontSizeMultiplier ?? 2).toBeGreaterThanOrEqual(2);
    }
    for (const name of [t.retry, t.reset]) {
      const button = screen.getByRole('button', { name });
      expect(button.props.accessibilityHint).toBeTruthy();
      expect(StyleSheet.flatten(button.props.style).minHeight).toBeGreaterThanOrEqual(44);
    }
  });
});
