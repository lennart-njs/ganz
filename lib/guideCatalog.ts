// Katalog der Anleitungen (Entscheidung 15). App und Server lesen ihn gleich.
// Heute: der Demo-Eintrag aus data/guides.ts. Dazu kommen freigegebene Einträge vom Server
// (GET /api/guides), die aus Gebrauchsanweisungen importiert und von einem Menschen geprüft wurden.
import { demoConfig } from '@/config/demo.config';
import { GUIDE_SOURCE, guides as demoGuides } from '@/data/guides';
import type { Device, Guide, GuideCatalogEntry } from '@/model/types';

export const demoCatalogEntry: GuideCatalogEntry = {
  id: 'miele-wkb130',
  manufacturerId: demoConfig.manufacturer.id,
  category: 'waschmaschine',
  models: [demoConfig.device.model],
  materialNumbers: [demoConfig.device.typePlate.materialNumber],
  document: { title: GUIDE_SOURCE, license: 'demo' },
  review: { status: 'freigegeben', by: 'Demo (wörtlich aus guides())' },
  origin: 'manuell',
  guides: Object.values(demoGuides),
};

const entries = new Map<string, GuideCatalogEntry>([[demoCatalogEntry.id, demoCatalogEntry]]);

/** Nimmt einen Eintrag auf. Nur freigegebene Einträge zählen, ein zurückgezogener fliegt raus. */
export function registerCatalogEntry(entry: GuideCatalogEntry): boolean {
  if (entry.review.status !== 'freigegeben') {
    if (entry.review.status === 'zurueckgezogen') entries.delete(entry.id);
    return false;
  }
  entries.set(entry.id, entry);
  return true;
}

/** Nur für Tests: zurück auf den Demo-Eintrag */
export function resetCatalog() {
  entries.clear();
  entries.set(demoCatalogEntry.id, demoCatalogEntry);
}

export function catalogEntries(): GuideCatalogEntry[] {
  return [...entries.values()];
}

const norm = (x: string) => x.replace(/[\s.-]/g, '').toLowerCase();

export type DeviceKey = Pick<Device, 'manufacturerId' | 'category' | 'model' | 'materialNumber'>;

/** Eintrag für ein Gerät: zuerst über die Materialnummer, sonst über Hersteller, Gerätetyp und Modell */
export function findCatalogEntry(device: DeviceKey | undefined): GuideCatalogEntry | undefined {
  if (!device) return undefined;
  const all = catalogEntries();
  if (device.materialNumber) {
    const m = norm(device.materialNumber);
    const hit = all.find((e) => e.materialNumbers.some((x) => norm(x) === m));
    if (hit) return hit;
  }
  const model = norm(device.model);
  return all.find(
    (e) =>
      e.manufacturerId === device.manufacturerId &&
      e.category === device.category &&
      e.models.some((x) => norm(x) === model),
  );
}

/** Geprüfte Anleitungen für dieses Gerät. Leer: Der Assistent zeigt keine Schritte, es geht zu Hilfe. */
export function guidesForDevice(device: DeviceKey | undefined): Guide[] {
  return findCatalogEntry(device)?.guides ?? [];
}

export function deviceHasGuides(device: DeviceKey | undefined): boolean {
  return guidesForDevice(device).length > 0;
}

/** Eine Anleitung nach id, aus allen Einträgen. Ids sind über den Katalog eindeutig. */
export function getGuide(id: string | undefined): Guide | undefined {
  if (!id) return undefined;
  for (const e of entries.values()) {
    const g = e.guides.find((x) => x.id === id);
    if (g) return g;
  }
  return undefined;
}

/** Kurze Prüfung eines Eintrags, z. B. nach dem Import oder vor dem Registrieren */
export function validateCatalogEntry(e: unknown): string[] {
  const errors: string[] = [];
  const o = e as Partial<GuideCatalogEntry> | null;
  if (!o || typeof o !== 'object') return ['kein Objekt'];
  if (!o.id || !/^[a-z0-9-]+$/.test(o.id)) errors.push('id fehlt oder enthält andere Zeichen');
  if (!o.manufacturerId) errors.push('manufacturerId fehlt');
  if (!o.category) errors.push('category fehlt');
  if (!o.models?.length && !o.materialNumbers?.length) errors.push('kein Modell und keine M.-Nr.');
  if (!o.document?.title) errors.push('document.title fehlt');
  if (!o.review?.status) errors.push('review.status fehlt');
  if (o.review?.status === 'freigegeben' && !o.review.by) errors.push('Freigabe ohne Namen');
  if (!Array.isArray(o.guides) || o.guides.length === 0) errors.push('keine Anleitungen');
  o.guides?.forEach((g, i) => {
    if (!g.id || !g.title || !Array.isArray(g.steps) || g.steps.length === 0)
      errors.push(`guides[${i}] unvollständig`);
    g.steps?.forEach((s, j) => {
      if (!s.t || !s.d) errors.push(`guides[${i}].steps[${j}] ohne Titel oder Text`);
    });
  });
  return errors;
}
