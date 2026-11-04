// Telefon-App, Mail-App und Einstellungen des Telefons öffnen, ohne Absturz (Schritt 24). Geht
// das nicht, etwa auf einem Tablet ohne Telefon oder im Web, liefert es false. Den Hinweis zeigt
// der Screen.
import { Linking, Platform } from 'react-native';

/** Öffnet die Telefon-App mit der Nummer. Leerzeichen gehören nicht in den Link. */
export async function openPhone(phone: string): Promise<boolean> {
  try {
    await Linking.openURL(`tel:${phone.replace(/\s/g, '')}`);
    return true;
  } catch {
    return false;
  }
}

/** Öffnet die Mail-App mit der Adresse. Geht das nicht, liefert es false wie openPhone. */
export async function openMail(email: string): Promise<boolean> {
  try {
    await Linking.openURL(`mailto:${email.trim()}`);
    return true;
  } catch {
    return false;
  }
}

/** Öffnet die Einstellungen der App. Im Web gibt es sie nicht, dort fehlt Linking.openSettings. */
export async function openSystemSettings(): Promise<boolean> {
  if (Platform.OS === 'web' || typeof Linking.openSettings !== 'function') return false;
  try {
    await Linking.openSettings();
    return true;
  } catch {
    return false;
  }
}
