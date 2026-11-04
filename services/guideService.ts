// Katalog der Anleitungen vom eigenen Server (app/api/guides+api.ts, Entscheidung 24).
import { MATERIAL_NUMBER, validateCatalogEntry, type DeviceKey } from '@/lib/guideCatalog';
import type { GuideCatalogEntry } from '@/model/types';

export interface GuideService {
  /** Freigegebener Eintrag für ein Gerät, sonst null (keine Anleitung oder nicht erreichbar) */
  forDevice(device: DeviceKey): Promise<GuideCatalogEntry | null>;
}

export const httpGuideService: GuideService = {
  async forDevice(device) {
    const q = new URLSearchParams({
      hersteller: device.manufacturerId,
      kategorie: device.category,
      modell: device.model,
      // Eine Materialnummer in anderer Form lehnt der Server ab, dann zählt nur das Modell
      ...(device.materialNumber && MATERIAL_NUMBER.test(device.materialNumber)
        ? { material: device.materialNumber }
        : {}),
    });
    try {
      const res = await fetch(`/api/guides?${q.toString()}`);
      if (!res.ok) return null;
      const data = (await res.json()) as { entry?: GuideCatalogEntry };
      const entry = data.entry;
      if (!entry || entry.review?.status !== 'freigegeben') return null;
      return validateCatalogEntry(entry).length ? null : entry;
    } catch {
      return null;
    }
  },
};
