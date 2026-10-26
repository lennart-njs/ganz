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

export const notifications = {
  /** Zeigt den Systemdialog. Gibt zurück, ob Mitteilungen erlaubt sind. */
  async requestPermission(): Promise<boolean> {
    const n = load();
    if (!n) return false;
    const current = await n.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const next = await n.requestPermissionsAsync();
    return next.granted;
  },

  async notify(title: string, body: string): Promise<void> {
    const n = load();
    if (!n) return;
    await n.scheduleNotificationAsync({ content: { title, body }, trigger: null });
  },
};
