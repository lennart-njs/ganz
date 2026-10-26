import { useEffect, useState } from 'react';

import { useAppStore } from './appStore';

/** Wahr, sobald der gespeicherte Zustand geladen ist. Vorher entscheidet die Navigation nichts. */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useAppStore.persist.hasHydrated());
  useEffect(() => {
    const unsub = useAppStore.persist.onFinishHydration(() => setHydrated(true));
    setHydrated(useAppStore.persist.hasHydrated());
    return unsub;
  }, []);
  return hydrated;
}
