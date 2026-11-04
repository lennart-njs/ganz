// Lokale Mitteilungen, nur nach Zustimmung. Remote-Push braucht Development Build und Backend.
import Constants from 'expo-constants';
import { Platform } from 'react-native';

type NotificationsModule = typeof import('expo-notifications');

let mod: NotificationsModule | null | undefined;

/** Lädt expo-notifications erst bei Bedarf. In Expo Go auf Android gibt es keine Mitteilungen. */
function load(): NotificationsModule | null {
  if (mod !== undefined) return mod;
  const expoGoAndroid =
    Platform.OS === 'android' && Constants.executionEnvironment === 'storeClient';
  if (Platform.OS === 'web' || expoGoAndroid) {
    mod = null;
    return mod;
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  mod = require('expo-notifications') as NotificationsModule;
  mod.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  return mod;
}

/**
 * Antwort auf die Frage nach Mitteilungen. asked sagt, ob der Systemdialog wirklich kam. Nur seine
 * Antwort ist eine Einwilligung. Erlaubt das Telefon Mitteilungen schon (Android bis 12, oder
 * seit einem früheren Lauf), kommt kein Dialog. Dann hat die Person in ganz nichts entschieden.
 */
export interface PermissionAnswer {
  granted: boolean;
  asked: boolean;
}

export const notifications = {
  /** Kommt der Systemdialog, wenn ganz jetzt fragt? Nicht im Web, nicht in Expo Go auf Android. */
  async canAsk(): Promise<boolean> {
    const n = load();
    if (!n) return false;
    const current = await n.getPermissionsAsync();
    return !current.granted && current.canAskAgain;
  },

  /** Zeigt den Systemdialog, wenn es ihn gibt. Gibt zurück, ob Mitteilungen erlaubt sind. */
  async requestPermission(): Promise<PermissionAnswer> {
    const n = load();
    if (!n) return { granted: false, asked: false };
    const current = await n.getPermissionsAsync();
    if (current.granted) return { granted: true, asked: false };
    if (!current.canAskAgain) return { granted: false, asked: false };
    const next = await n.requestPermissionsAsync();
    return { granted: next.granted, asked: true };
  },

  async notify(title: string, body: string): Promise<void> {
    const n = load();
    if (!n) return;
    await n.scheduleNotificationAsync({ content: { title, body }, trigger: null });
  },
};
