import fs from 'fs';
import path from 'path';

import { getConfig } from 'expo/config';
import { Updates } from 'expo/config-plugins';

import {
  APP_VARIANTS,
  BASE_APP_ID,
  VARIANTS,
  buildAppConfig,
  resolveAppVariant,
  type AppVariant,
} from '@/app.config';
import { de } from '@/i18n/de';

import { version } from '../../package.json';

const root = path.resolve(__dirname, '../..');
const ENV_KEYS = ['APP_VARIANT', 'EXPO_PUBLIC_APP_VARIANT'] as const;
const saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

/** Lädt die Konfiguration wie `npx expo config`, mit den Variablen nur für diesen Aufruf. */
function loadConfig(env: Partial<Record<(typeof ENV_KEYS)[number], string>>) {
  for (const k of ENV_KEYS) delete process.env[k];
  Object.assign(process.env, env);
  return getConfig(root, { isPublicConfig: true }).exp;
}

// Stand von app.json vor Schritt 29. Plugins und Rechte bleiben gleich.
const PLUGINS = [
  'expo-router',
  'expo-font',
  [
    'expo-camera',
    {
      cameraPermission: de.app.cameraPermission,
      microphonePermission: false,
      recordAudioAndroid: false,
    },
  ],
];

const EXPECTED: Record<AppVariant, { name: string; id: string; channel: string }> = {
  development: { name: 'mach’s dev', id: `${BASE_APP_ID}.dev`, channel: 'development' },
  pitch: { name: 'mach’s pitch', id: `${BASE_APP_ID}.pitch`, channel: 'pitch' },
  production: { name: 'mach’s', id: BASE_APP_ID, channel: 'production' },
};

describe('app.config.ts je Variante', () => {
  test.each(APP_VARIANTS)('APP_VARIANT=%s lädt wie npx expo config', (variant) => {
    const exp = loadConfig({ APP_VARIANT: variant });
    const expected = EXPECTED[variant];

    expect(exp.name).toBe(expected.name);
    expect(exp.slug).toBe('machs');
    expect(exp.version).toBe(version);
    expect(exp.ios?.bundleIdentifier).toBe(expected.id);
    expect(exp.android?.package).toBe(expected.id);
    expect(exp.updates?.requestHeaders).toEqual({ 'expo-channel-name': expected.channel });
    expect(exp.extra?.appVariant).toBe(variant);
    expect(exp.android?.allowBackup).toBe(false);
    expect(exp.web?.output).toBe('server');
    expect(exp.web?.favicon).toBe('./assets/brand/icon.png');
    expect(exp.icon).toBe('./assets/brand/icon.png');
    expect(exp.plugins).toEqual(PLUGINS);
    expect(exp.android?.permissions).toEqual(['android.permission.CAMERA']);
    expect(exp.scheme).toBe('machs');
    expect(exp.userInterfaceStyle).toBe('automatic');
    expect(exp.ios?.supportsTablet).toBe(false);
  });

  test('nur app.config.ts gilt: keine app.json daneben, Kennung von mach’s', () => {
    // Nur eine Quelle: Eine app.json daneben ginge still als Basis in die Konfiguration ein.
    expect(fs.existsSync(path.join(root, 'app.json'))).toBe(false);
    expect(BASE_APP_ID).toBe('io.machs.app');
    expect(loadConfig({ APP_VARIANT: 'production' }).name).toBe('mach’s');
  });

  test('ohne APP_VARIANT gilt development', () => {
    expect(loadConfig({}).extra?.appVariant).toBe('development');
    expect(loadConfig({ APP_VARIANT: '  ' }).extra?.appVariant).toBe('development');
  });

  test('EXPO_PUBLIC_APP_VARIANT allein wählt die Variante auch', () => {
    expect(loadConfig({ EXPO_PUBLIC_APP_VARIANT: 'pitch' }).ios?.bundleIdentifier).toBe(
      `${BASE_APP_ID}.pitch`,
    );
    expect(loadConfig({ APP_VARIANT: 'pitch', EXPO_PUBLIC_APP_VARIANT: 'pitch' }).name).toBe(
      'mach’s pitch',
    );
  });

  test('ein Tippfehler oder zwei verschiedene Werte brechen ab', () => {
    expect(() => loadConfig({ APP_VARIANT: 'pitc' })).toThrow(/Unbekannte App-Variante "pitc"/);
    expect(() => loadConfig({ EXPO_PUBLIC_APP_VARIANT: 'Production' })).toThrow(
      /Unbekannte App-Variante/,
    );
    expect(() =>
      loadConfig({ APP_VARIANT: 'pitch', EXPO_PUBLIC_APP_VARIANT: 'production' }),
    ).toThrow(/Beide müssen gleich sein/);
  });

  test('jede Variante hat eine eigene Kennung und einen eigenen Kanal', () => {
    const ids = APP_VARIANTS.map((v) => VARIANTS[v].appId);
    const channels = APP_VARIANTS.map((v) => VARIANTS[v].channel);
    expect(new Set(ids).size).toBe(APP_VARIANTS.length);
    expect(new Set(channels).size).toBe(APP_VARIANTS.length);
    // Gültig für iOS und Android: Segmente aus Buchstaben, Ziffern und _, je mit Buchstabe vorn.
    for (const id of ids) expect(id).toMatch(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/);
  });

  test('Name und Kamera-Text sind gleich den Texten in i18n/de.ts', () => {
    for (const variant of APP_VARIANTS) {
      expect(buildAppConfig(variant).name).toBe(de.app.variantName[variant]);
    }
    expect(Object.keys(de.app.variantName).sort()).toEqual([...APP_VARIANTS].sort());
  });
});

describe('Laufzeit und Updates', () => {
  test('development bleibt in Expo Go ladbar: Laufzeit exposdk wie das SDK', async () => {
    const exp = loadConfig({ APP_VARIANT: 'development' });
    expect(exp.runtimeVersion).toBeUndefined();
    // So rechnet der Dev-Server die Laufzeit für Expo Go aus (ExpoGoManifestHandlerMiddleware).
    const runtime = await Updates.getRuntimeVersionAsync(
      root,
      { ...exp, runtimeVersion: exp.runtimeVersion ?? { policy: 'sdkVersion' } },
      'ios',
    );
    expect(runtime).toBe(`exposdk:${exp.sdkVersion}`);
  });

  test.each(['pitch', 'production'] as const)('%s nimmt die Laufzeit aus dem Fingerprint', (v) => {
    expect(loadConfig({ APP_VARIANT: v }).runtimeVersion).toEqual({ policy: 'fingerprint' });
  });

  test('nur der Pitch-Build sucht nie von selbst nach Updates', () => {
    expect(buildAppConfig('pitch').updates?.checkAutomatically).toBe('NEVER');
    expect(buildAppConfig('production').updates?.checkAutomatically).toBeUndefined();
    expect(buildAppConfig('development').updates?.checkAutomatically).toBeUndefined();
  });

  test('ohne EAS-Projekt keine Update-Adresse, mit Projekt Adresse und projectId', () => {
    expect(buildAppConfig('pitch').updates?.url).toBeUndefined();
    expect(buildAppConfig('pitch').extra?.eas).toBeUndefined();

    const withProject = buildAppConfig('pitch', {}, 'abc-123');
    expect(withProject.updates?.url).toBe('https://u.expo.dev/abc-123');
    expect(withProject.extra).toEqual({ appVariant: 'pitch', eas: { projectId: 'abc-123' } });
  });

  test('resolveAppVariant ist rein', () => {
    expect(resolveAppVariant({})).toBe('development');
    expect(resolveAppVariant({ APP_VARIANT: ' production ' })).toBe('production');
  });
});
