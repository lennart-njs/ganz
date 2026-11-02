/**
 * @jest-environment node
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { GET } from '@/app/api/guides+api';
import {
  deviceHasGuides,
  findCatalogEntry,
  getGuide,
  registerCatalogEntry,
  resetCatalog,
  validateCatalogEntry,
} from '@/lib/guideCatalog';
import type { GuideCatalogEntry } from '@/model/types';
import { loadApprovedCatalog } from '@/server/guides/catalogStore';

const dryer = (status: GuideCatalogEntry['review']['status']): GuideCatalogEntry => ({
  id: 'miele-twb140',
  manufacturerId: 'miele',
  category: 'trockner',
  models: ['TWB 140'],
  materialNumbers: ['12 345 678'],
  document: { title: 'Gebrauchsanweisung TWB 140 (Beispiel)', license: 'hersteller', pages: 64 },
  review: { status, by: status === 'freigegeben' ? 'Miele Kundendienst' : undefined },
  origin: 'import',
  guides: [
    {
      id: 'miele-twb140/flusensieb',
      kind: 'pflege',
      title: 'Flusensieb reinigen',
      code: 'Flusen',
      sourceDocument: 'Gebrauchsanweisung TWB 140 (Beispiel)',
      steps: [
        { t: 'Tür öffnen', d: 'Öffne die Tür.', src: { page: 31, text: 'Öffnen Sie die Tür.' } },
      ],
    },
  ],
});

const device = { manufacturerId: 'miele', category: 'trockner' as const, model: 'TWB 140' };

afterEach(() => resetCatalog());

describe('Katalog der Anleitungen (Entscheidung 24)', () => {
  test('ein Entwurf zählt nicht, erst die Freigabe macht die Anleitung sichtbar', () => {
    expect(registerCatalogEntry(dryer('entwurf'))).toBe(false);
    expect(deviceHasGuides(device)).toBe(false);
    expect(registerCatalogEntry(dryer('freigegeben'))).toBe(true);
    expect(deviceHasGuides(device)).toBe(true);
    expect(getGuide('miele-twb140/flusensieb')?.steps[0]?.src?.page).toBe(31);
  });

  test('zurückgezogen entfernt den Eintrag wieder', () => {
    registerCatalogEntry(dryer('freigegeben'));
    registerCatalogEntry(dryer('zurueckgezogen'));
    expect(findCatalogEntry(device)).toBeUndefined();
  });

  test('Modelle aus dem Gerätekatalog haben ihren eigenen Eintrag, andere Geräte keinen', () => {
    expect(
      findCatalogEntry({ manufacturerId: 'miele', category: 'geschirrspueler', model: 'G 5833 SC' })
        ?.id,
    ).toBe('miele-g5833sc');
    expect(
      deviceHasGuides({ manufacturerId: 'miele', category: 'waschmaschine', model: 'WKB 130' }),
    ).toBe(true);
    expect(deviceHasGuides({ manufacturerId: 'bosch', category: 'kuehlschrank', model: 'X' })).toBe(
      false,
    );
  });

  test('die Prüfung verlangt Quelle, Freigabe mit Namen und Schritte mit Text', () => {
    const bad = { ...dryer('freigegeben'), review: { status: 'freigegeben' as const } };
    expect(validateCatalogEntry(bad)).toContain('Freigabe ohne Namen');
    expect(validateCatalogEntry(dryer('entwurf'))).toEqual([]);
  });

  test('der Server liest nur gültige Dateien aus dem Katalog-Ordner', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'katalog-'));
    fs.writeFileSync(path.join(dir, 'gut.json'), JSON.stringify(dryer('freigegeben')));
    fs.writeFileSync(path.join(dir, 'kaputt.json'), '{');
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const added = loadApprovedCatalog(dir, true);
    expect(added.map((e) => e.id)).toEqual(['miele-twb140']);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});

describe('GET /api/guides', () => {
  const get = (q: string) => GET(new Request(`http://localhost/api/guides?${q}`));

  test('liefert den freigegebenen Eintrag für das Gerät', async () => {
    const res = get('hersteller=miele&kategorie=waschmaschine&modell=WKB%20130');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.entry.id).toBe('miele-wkb130');
    expect(body.entry.review.status).toBe('freigegeben');
  });

  test('ohne geprüfte Anleitung 404, ohne Angaben 400', async () => {
    expect(get('hersteller=miele&kategorie=kuehlschrank&modell=K%207000').status).toBe(404);
    expect(get('modell=WKB%20130').status).toBe(400);
  });
});
