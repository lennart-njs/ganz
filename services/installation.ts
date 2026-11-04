// Installations-ID für das Rate-Limit der Chat-Route: eine zufällige Kennung dieser Installation.
// Sie entsteht erst mit der ersten Frage an den Assistenten, also nach der Einwilligung, und geht
// nur an den eigenen Server, nie an den Anbieter. Der Widerruf der Einwilligung, „Alles
// zurücksetzen“, der Demo-Startstand und „Zurücksetzen“ nach einem Ladefehler löschen sie
// (deleteInstallationId). Ob das nach § 25 TDDDG unbedingt erforderlich ist, prüft der Anwalt
// (docs/recht/RECHTSFRAGEN.md, Nr. 14).
import AsyncStorage from '@react-native-async-storage/async-storage';

import { INSTALLATION_ID } from '@/lib/chat/protocol';

export const INSTALLATION_KEY = 'ganz-installation-id';

let cached: string | undefined;

function randomId(): string {
  const crypto = globalThis.crypto;
  if (typeof crypto?.randomUUID === 'function') return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  if (typeof crypto?.getRandomValues === 'function') crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Die Installations-ID, beim ersten Aufruf angelegt. undefined, wenn der Speicher nicht geht.
 * Dann zählt die Route nur die IP-Adresse.
 */
export async function installationId(): Promise<string | undefined> {
  if (cached) return cached;
  try {
    const stored = await AsyncStorage.getItem(INSTALLATION_KEY);
    if (stored && INSTALLATION_ID.test(stored)) return (cached = stored);
    const id = randomId();
    await AsyncStorage.setItem(INSTALLATION_KEY, id);
    return (cached = id);
  } catch {
    return undefined;
  }
}

/** Für Tests: die gemerkte ID vergessen */
export function forgetInstallationId() {
  cached = undefined;
}

/**
 * Löscht die Installations-ID im Speicher und im Gedächtnis: bei „Alles zurücksetzen“, beim
 * Demo-Startstand, beim Zurücksetzen nach einem Ladefehler und mit dem Widerruf der Einwilligung
 * in den Assistenten. Die nächste Frage legt eine neue an, also erst nach einer neuen Einwilligung.
 */
export async function deleteInstallationId(): Promise<void> {
  cached = undefined;
  try {
    await AsyncStorage.removeItem(INSTALLATION_KEY);
  } catch {
    // Ohne Speicher gibt es nichts zu löschen
  }
}
