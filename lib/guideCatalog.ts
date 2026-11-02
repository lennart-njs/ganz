// Katalog der Anleitungen (Entscheidung 24 dieses Branches, siehe ENTSCHEIDUNGEN 24). App und Server lesen ihn gleich.
// Eingebaut: die Demo-Waschmaschine (data/guides.ts) und die Modelle aus data/catalog.ts mit ihren
// Anleitungen aus der Gebrauchsanweisung (data/modelGuides.ts). Dazu kommen freigegebene Einträge
// vom Server (GET /api/guides), die aus Gebrauchsanweisungen importiert und geprüft wurden.
import { demoConfig } from '@/config/demo.config';
import { catalog } from '@/data/catalog';
import { GUIDE_SOURCE, demoGuides, guides as allGuides } from '@/data/guides';
import { deviceGuides } from '@/lib/appliance';
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

/** Modelle aus data/catalog.ts: je Gebrauchsanweisung ein Eintrag mit genau ihren Anleitungen */
export const modelCatalogEntries: GuideCatalogEntry[] = catalog
  .filter((m) => m.problems?.length)
  .map((m) => {
    const ids = [
      ...new Set([
        ...(m.problems ?? []).map((p) => p.guideId),
        ...(m.messages ?? []).map((x) => x.guideId),
        m.patterns.ablauf,
        m.patterns.zulauf,
      ]),
    ];
    return {
      id: m.id,
      manufacturerId: m.manufacturerId,
      category: m.category,
      models: [m.model, ...(m.keywords ?? [])],
      materialNumbers: [],
      document: { title: m.manual, license: 'hersteller' as const },
      review: {
        status: 'freigegeben' as const,
        by: 'Demo (aus der Gebrauchsanweisung übernommen)',
      },
      origin: 'manuell' as const,
      guides: ids
        .map((id) => allGuides[id as keyof typeof allGuides])
        .filter((g): g is Guide => !!g),
    };
  });

const builtIn = (): [string, GuideCatalogEntry][] =>
  [demoCatalogEntry, ...modelCatalogEntries].map((e) => [e.id, e]);

const entries = new Map<string, GuideCatalogEntry>(builtIn());

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
  for (const [id, e] of builtIn()) entries.set(id, e);
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

/**
 * Geprüfte Anleitungen für dieses Gerät. Zuerst der Katalog (Modell oder M.-Nr.), sonst wie in der App
 * (deviceGuides): jede andere Waschmaschine bekommt die Demo-Anleitungen. Leer: keine Schritte, Hilfe holen.
 */
export function guidesForDevice(device: DeviceKey | undefined): Guide[] {
  const entry = findCatalogEntry(device);
  if (entry) return entry.guides;
  const set = deviceGuides(device);
  if (!set) return [];
  const ids = new Set([
    ...set.problems.map((p) => p.guideId),
    ...set.messages.map((m) => m.guideId),
    ...(set.care ? Object.keys(demoGuides) : []),
  ]);
  return [...ids].map((id) => getGuide(id)).filter((g): g is Guide => !!g);
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
