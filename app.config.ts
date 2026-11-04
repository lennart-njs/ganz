// App-Konfiguration für Expo. Ersetzt app.json und kennt drei Varianten: development, pitch und
// production, gewählt mit APP_VARIANT (Standard development). Gleich den Profilen in eas.json.
// Prüfen: APP_VARIANT=pitch npx expo config --type public
//
// Expo lädt diese Datei in Node, ohne Bundler. Eigene TypeScript-Dateien lassen sich hier nicht
// importieren, nur Typen und JSON. Darum steht alles zu den Varianten in dieser Datei.
import type { ConfigContext, ExpoConfig } from 'expo/config';

import { version } from './package.json';

export const APP_VARIANTS = ['development', 'pitch', 'production'] as const;
export type AppVariant = (typeof APP_VARIANTS)[number];

export const DEFAULT_VARIANT: AppVariant = 'development';

/**
 * Platzhalter für Bundle-ID (iOS) und Paketname (Android). Lennart bestätigt die Kennung vor dem
 * ersten Build, denn bei Apple und Google lässt sie sich danach nicht mehr ändern
 * (docs/ANNAHMEN.md, Schritt 29).
 */
export const BASE_APP_ID = 'io.machs.app';

/**
 * Projekt-ID bei EAS. Sie entsteht erst mit `eas init` (Schritt 30, braucht ein Expo-Konto) und
 * kommt dann hierher. Ohne sie hat der Build keine Update-Adresse, alles andere gilt schon.
 */
export const EAS_PROJECT_ID: string | undefined = undefined;

// Gleich de.app.variantName und de.app.cameraPermission in i18n/de.ts. Ein Test vergleicht beide.
const CAMERA_PERMISSION =
  'mach’s nutzt die Kamera für Fotos von Display, Typenschild und Bauteil. Die Fotos bleiben in deinem Fall.';

export interface VariantSettings {
  /** Name unter dem App-Icon */
  name: string;
  /** Kennung im App Store und im Play Store, je Variante eigen */
  appId: string;
  /** Kanal für EAS Update. Ein Update erreicht nur Builds mit demselben Kanal. */
  channel: AppVariant;
}

export const VARIANTS: Record<AppVariant, VariantSettings> = {
  development: { name: 'mach’s dev', appId: `${BASE_APP_ID}.dev`, channel: 'development' },
  pitch: { name: 'mach’s pitch', appId: `${BASE_APP_ID}.pitch`, channel: 'pitch' },
  production: { name: 'mach’s', appId: BASE_APP_ID, channel: 'production' },
};

export function isAppVariant(value: unknown): value is AppVariant {
  return typeof value === 'string' && (APP_VARIANTS as readonly string[]).includes(value);
}

export interface VariantEnv {
  APP_VARIANT?: string;
  EXPO_PUBLIC_APP_VARIANT?: string;
}

const clean = (value: string | undefined) => (value?.trim() ? value.trim() : undefined);

/**
 * Variante aus der Umgebung. APP_VARIANT gilt zuerst, sonst EXPO_PUBLIC_APP_VARIANT, sonst
 * development. Ein unbekannter Wert oder zwei verschiedene Werte brechen ab, damit kein
 * Tippfehler still zu einem Entwicklungs-Build wird.
 */
export function resolveAppVariant(env: VariantEnv): AppVariant {
  const build = clean(env.APP_VARIANT);
  const bundle = clean(env.EXPO_PUBLIC_APP_VARIANT);
  for (const value of [build, bundle]) {
    if (value !== undefined && !isAppVariant(value)) {
      throw new Error(`Unbekannte App-Variante "${value}". Erlaubt: ${APP_VARIANTS.join(', ')}.`);
    }
  }
  if (build !== undefined && bundle !== undefined && build !== bundle) {
    throw new Error(
      `APP_VARIANT ist "${build}", EXPO_PUBLIC_APP_VARIANT ist "${bundle}". Beide müssen gleich sein.`,
    );
  }
  const value = build ?? bundle;
  return isAppVariant(value) ? value : DEFAULT_VARIANT;
}

export function buildAppConfig(
  variant: AppVariant,
  base: Partial<ExpoConfig> = {},
  projectId: string | undefined = EAS_PROJECT_ID,
): ExpoConfig {
  const { name, appId, channel } = VARIANTS[variant];
  return {
    ...base,
    name,
    slug: 'machs',
    version,
    orientation: 'portrait',
    scheme: 'machs',
    userInterfaceStyle: 'automatic',
    icon: './assets/brand/icon.png',
    // Expo Go kennt nur die Laufzeit seines SDK (exposdk:58.0.0). development läuft heute in Expo
    // Go und bekommt darum keine eigene Laufzeit. pitch und production nehmen den Fingerprint:
    // Ein Update erreicht nur Builds mit genau demselben nativen Stand.
    ...(variant === 'development' ? {} : { runtimeVersion: { policy: 'fingerprint' as const } }),
    updates: {
      ...(projectId ? { url: `https://u.expo.dev/${projectId}` } : {}),
      requestHeaders: { 'expo-channel-name': channel },
      // Im Pitch-Build lädt die App Updates nie von selbst. Den Tap dafür baut Schritt 30.
      ...(variant === 'pitch' ? { checkAutomatically: 'NEVER' as const } : {}),
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: appId,
    },
    android: {
      package: appId,
      predictiveBackGestureEnabled: false,
      // Keine Sicherung von Fällen und Einwilligungen über Android-Backup (ZUKUNFTSPLAN 5).
      allowBackup: false,
    },
    web: {
      // Die Chat-Route (app/api/chat+api.ts) und das Backend für Händler (app/api/v1) brauchen den
      // Server-Ausgang.
      output: 'server',
      favicon: './assets/brand/icon.png',
    },
    plugins: [
      'expo-router',
      'expo-font',
      [
        'expo-camera',
        {
          cameraPermission: CAMERA_PERMISSION,
          microphonePermission: false,
          recordAudioAndroid: false,
        },
      ],
    ],
    extra: {
      ...base.extra,
      // Die Variante zur Laufzeit: Constants.expoConfig.extra.appVariant. Im Bundle steht sie
      // als EXPO_PUBLIC_APP_VARIANT, wenn die Umgebung sie setzt (eas.json, EAS-Umgebung).
      appVariant: variant,
      ...(projectId ? { eas: { projectId } } : {}),
    },
  };
}

export default function appConfig({ config }: ConfigContext): ExpoConfig {
  const variant = resolveAppVariant({
    APP_VARIANT: process.env.APP_VARIANT,
    EXPO_PUBLIC_APP_VARIANT: process.env.EXPO_PUBLIC_APP_VARIANT,
  });
  return buildAppConfig(variant, config);
}
