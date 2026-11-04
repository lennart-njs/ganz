// Katalog der Anleitungen (Entscheidung 24): GET /api/guides?hersteller=miele&kategorie=waschmaschine&modell=WKB%20130&material=11%20450%20120
// Gibt nur freigegebene Anleitungen für genau dieses Gerät zurück. Ohne Treffer: 404, die App holt dann Hilfe.
import { MATERIAL_NUMBER, findCatalogEntry } from '@/lib/guideCatalog';
import type { DeviceCategory } from '@/model/types';
import { loadApprovedCatalog } from '@/server/guides/catalogStore';

const categories: DeviceCategory[] = [
  'waschmaschine',
  'geschirrspueler',
  'trockner',
  'kuehlschrank',
];

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export function GET(request: Request): Response {
  const q = new URL(request.url).searchParams;
  const manufacturerId = q.get('hersteller') ?? '';
  const category = q.get('kategorie') as DeviceCategory | null;
  const model = q.get('modell') ?? '';
  const materialNumber = q.get('material') ?? undefined;
  if (
    !manufacturerId ||
    manufacturerId.length > 40 ||
    !category ||
    !categories.includes(category) ||
    model.length > 80 ||
    (materialNumber !== undefined && !MATERIAL_NUMBER.test(materialNumber))
  ) {
    return json({ error: 'ungueltig' }, 400);
  }
  loadApprovedCatalog();
  const entry = findCatalogEntry({ manufacturerId, category, model, materialNumber });
  if (!entry) return json({ error: 'keine_anleitung' }, 404);
  return json({ entry });
}
