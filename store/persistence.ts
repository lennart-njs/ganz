// Laden und Speichern des Stands: Version, Migration, Sicherung des Rohwerts und Ladezustand.
// Die App startet immer, auch mit kaputtem Speicher (Schritt 19).
import type { PersistStorage, StateStorage, StorageValue } from 'zustand/middleware';
import { createStore } from 'zustand/vanilla';

import type { AppData } from './appStore';

export const STORE_KEY = 'machs-app';

/**
 * Version des gespeicherten Stands. Wer sie erhöht, braucht eine Migration in MIGRATIONS.
 * Ohne Migration würde zustand alle gespeicherten Fälle verwerfen. Ein Test passt darauf auf.
 */
export const STORE_VERSION = 1;

/** Unter diesem Präfix plus ISO-Zeit liegt jeder Rohwert, der sich nicht laden ließ. */
export const BACKUP_PREFIX = `${STORE_KEY}-backup-`;

/**
 * Je ein Schritt von Version n auf n + 1. Version 1 ist der erste gespeicherte Stand.
 * Beispiel für Version 2: `1: (state) => ({ ...(state as object), neuesFeld: [] })`.
 */
export const MIGRATIONS: Readonly<Record<number, (state: unknown) => unknown>> = {};

export type StoreLoadProblem = 'json' | 'version' | 'form';

/** Der gespeicherte Stand passt nicht zur App. Die App zeigt dann den Hinweis zum Wiederherstellen. */
export class StoreLoadError extends Error {
  constructor(
    readonly problem: StoreLoadProblem,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = 'StoreLoadError';
  }
}

/** Bringt einen Stand aus `version` auf STORE_VERSION. Für Version 1 ist das die Identität. */
export function migrateStoredState(state: unknown, version: number): unknown {
  if (!Number.isInteger(version) || version < 1 || version > STORE_VERSION) {
    throw new StoreLoadError(
      'version',
      `Unbekannte Version ${version}, erwartet 1 bis ${STORE_VERSION}`,
    );
  }
  let migrated = state;
  for (let v = version; v < STORE_VERSION; v++) {
    const step = MIGRATIONS[v];
    if (!step) throw new StoreLoadError('version', `Keine Migration von Version ${v} auf ${v + 1}`);
    migrated = step(migrated);
  }
  return migrated;
}

/** Auch ein Speicher, der synchron wirft, liefert ein abgelehntes Promise. */
function attempt<T>(fn: () => T | Promise<T>): Promise<T> {
  try {
    return Promise.resolve(fn());
  } catch (error) {
    return Promise.reject(error);
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Liest den Umschlag, den persist schreibt: `{ state, version }`. Wirft bei allem anderen. */
function parseEnvelope(raw: string): StorageValue<AppData> {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch (cause) {
    throw new StoreLoadError('json', 'Gespeicherter Stand ist kein JSON', { cause });
  }
  if (!isRecord(value) || !isRecord(value.state) || !Number.isInteger(value.version)) {
    throw new StoreLoadError(
      'json',
      'Gespeicherter Stand hat keinen Umschlag mit state und version',
    );
  }
  return value as unknown as StorageValue<AppData>;
}

export interface SafeStorage extends PersistStorage<AppData> {
  /**
   * Sichert den zuletzt gelesenen Rohwert unter BACKUP_PREFIX plus ISO-Zeit, einmal je Rohwert.
   * Liefert den Schlüssel der Sicherung oder undefined, wenn es nichts zu sichern gab.
   */
  backupLastRead: () => Promise<string | undefined>;
  /**
   * Liest den gespeicherten Rohwert neu und sichert ihn, falls er noch nicht gesichert ist.
   * Wirft, wenn Lesen oder Sichern scheitern. Dann darf nichts den Stand löschen.
   */
  backupStored: (name: string) => Promise<string | undefined>;
}

/**
 * Storage für persist. getItem hält den Rohwert fest, bevor es ihn parst. Scheitert das Parsen,
 * sichert es den Rohwert und wirft. Scheitern später Version oder Form, sichert der Fehlerpfad
 * beim Laden denselben Rohwert über backupLastRead.
 */
export function createSafeStorage(storage: StateStorage, now: () => string): SafeStorage {
  let lastRead: { name: string; raw: string } | undefined;
  // Je Rohwert eine Sicherung, auch wenn zwei Wege sie gleichzeitig anstoßen.
  const backups = new Map<string, Promise<string>>();

  const backup = (name: string, raw: string): Promise<string> => {
    const known = backups.get(raw);
    if (known) return known;
    const key = `${name}-backup-${now()}`;
    const written = attempt(() => storage.setItem(key, raw)).then(() => key);
    backups.set(raw, written);
    // Scheitert das Schreiben, versucht es der nächste Aufruf noch einmal.
    written.catch(() => backups.delete(raw));
    return written;
  };

  return {
    getItem: async (name) => {
      lastRead = undefined;
      const raw = await storage.getItem(name);
      if (raw === null) return null;
      lastRead = { name, raw };
      try {
        return parseEnvelope(raw);
      } catch (error) {
        // Der Fehler beim Laden zählt, auch wenn die Sicherung scheitert.
        await backup(name, raw).catch(() => undefined);
        throw error;
      }
    },
    setItem: (name, value) => storage.setItem(name, JSON.stringify(value)),
    removeItem: (name) => storage.removeItem(name),
    backupLastRead: async () => (lastRead ? backup(lastRead.name, lastRead.raw) : undefined),
    backupStored: async (name) => {
      const raw = await storage.getItem(name);
      return raw === null ? undefined : backup(name, raw);
    },
  };
}

export type LoadStatus = 'laedt' | 'ok' | 'fehler';

export interface LoadState {
  status: LoadStatus;
  /** Grund des letzten Fehlers beim Laden */
  error?: unknown;
}

/**
 * Ladezustand neben dem Store. In zustand 5 bleibt hasHydrated nach einem Fehler false, und
 * onFinishHydration kommt nie. Darum meldet onRehydrateStorage hier jeden Ausgang.
 */
export function createLoadState() {
  return createStore<LoadState>(() => ({ status: 'laedt' }));
}

export type LoadStateStore = ReturnType<typeof createLoadState>;
