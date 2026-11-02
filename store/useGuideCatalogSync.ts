// Holt für Geräte ohne Anleitung den freigegebenen Katalog-Eintrag vom Server (Entscheidung 24).
// Gefundene Einträge bleiben im Speicher der App, damit die Anleitung auch offline läuft.
import { useEffect } from 'react';

import { deviceHasGuides } from '@/lib/guideCatalog';
import { services } from '@/services';

import { useAppStore } from './appStore';

/** Pro App-Start fragt jedes Gerät höchstens einmal nach */
const asked = new Set<string>();

export function useGuideCatalogSync() {
  const devices = useAppStore((s) => s.devices);
  useEffect(() => {
    for (const d of devices) {
      if (asked.has(d.id) || deviceHasGuides(d)) continue;
      asked.add(d.id);
      void services.guides.forDevice(d).then((entry) => {
        if (entry) useAppStore.getState().addCatalogEntry(entry);
      });
    }
  }, [devices]);
}
