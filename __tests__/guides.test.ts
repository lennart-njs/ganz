import { guides } from '@/data/guides';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { compare } = require('../scripts/compare-guides');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { readDemoGuides } = require('../scripts/demoGuides');

describe('Anleitungen', () => {
  test('data/guides.ts ist wörtlich gleich mit guides() aus der Demo', () => {
    const demo = readDemoGuides();
    expect(Object.keys(demo)).toHaveLength(13);
    expect(compare(guides, demo)).toEqual([]);
  });

  test('der Vergleich findet eine Abweichung', () => {
    const demo = readDemoGuides();
    const changed = structuredClone(guides);
    changed.ablauf.steps[1]!.w = 'Vorsicht, heiß.';
    expect(compare(changed, demo)).toEqual([expect.stringContaining('ablauf.steps[1].w')]);
  });

  test('Pflege und Hinweis sind als solche markiert (B-08)', () => {
    expect(guides.hygiene.kind).toBe('pflege');
    expect(guides.dosierung.kind).toBe('hinweis');
    expect(guides.ablauf.kind).toBe('stoerung');
  });
});
