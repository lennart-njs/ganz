import { useStore } from 'zustand';

import { useAppStore, type AppStore } from './appStore';
import type { LoadStatus } from './persistence';

/**
 * Ladezustand des gespeicherten Stands. 'laedt', bis er geladen ist. Vorher entscheidet die
 * Navigation nichts. 'fehler', wenn er sich nicht laden lässt. Dann zeigt die App den Hinweis
 * zum Wiederherstellen, statt auf dem Splash-Screen zu hängen.
 */
export function useHydrated(store: AppStore = useAppStore): LoadStatus {
  return useStore(store.loading, (s) => s.status);
}
