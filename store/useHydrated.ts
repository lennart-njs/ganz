import { useSyncExternalStore } from 'react';

import { useAppStore } from './appStore';

// Meldet Beginn und Ende des Ladens, damit useSyncExternalStore jeden Wechsel sieht.
function subscribe(onChange: () => void): () => void {
  const offStart = useAppStore.persist.onHydrate(onChange);
  const offFinish = useAppStore.persist.onFinishHydration(onChange);
  return () => {
    offStart();
    offFinish();
  };
}

const hasHydrated = () => useAppStore.persist.hasHydrated();

/** Wahr, sobald der gespeicherte Zustand geladen ist. Vorher entscheidet die Navigation nichts. */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, hasHydrated, hasHydrated);
}
