import { catalog, findModel, searchCatalog } from '@/data/catalog';
import { guides } from '@/data/guides';
import { modelGuides } from '@/data/modelGuides';
import { de } from '@/i18n/de';
import { deviceGuides, guideForDevice, hasGuides } from '@/lib/appliance';
import { parseReply } from '@/lib/chat/prompt';

const label = (c: keyof typeof de.deviceCategory) => de.deviceCategory[c];

describe('Anleitungen aus den Gebrauchsanweisungen', () => {
  const all = Object.values(modelGuides);

  test('jeder Schritt nennt Seite und Originaltext', () => {
    for (const g of all) {
      expect(g.sourceDocument).toMatch(/Gebrauchsan(weisung|leitung)/);
      for (const s of g.steps) {
        expect(s.src?.page).toBeGreaterThan(0);
        expect(s.src?.text.length).toBeGreaterThan(10);
      }
    }
  });

  test('Texte in der App: Du-Form, kein Ausrufezeichen', () => {
    for (const g of all) {
      for (const s of g.steps) {
        for (const text of [s.t, s.d, s.w ?? '']) {
          expect(text).not.toMatch(/\bSie\b|\bIhr(e|en)?\b|!/);
        }
      }
    }
  });

  test('Warnhinweise der Gebrauchsanweisung bleiben erhalten', () => {
    // Jeder Warnhinweis steht in der Quelle des Schritts (bis auf die Du-Form)
    const core = (s: string) => s.split('.')[0]!.trim();
    for (const g of all) {
      for (const s of g.steps) {
        if (s.w && !s.w.startsWith('Wenn') && !s.w.startsWith('Spül')) {
          expect(s.src!.text).toContain(core(s.w));
        }
      }
    }
  });

  test('Einstiege und Meldungen zeigen auf Anleitungen aus derselben Gebrauchsanweisung', () => {
    for (const m of catalog) {
      for (const x of [...(m.problems ?? []), ...(m.messages ?? [])]) {
        expect(guides).toHaveProperty(x.guideId);
        expect(guides[x.guideId as keyof typeof guides].sourceDocument).toBe(m.manual);
      }
      expect(guides[m.patterns.ablauf as keyof typeof guides].sourceDocument).toBe(m.manual);
      expect(guides[m.patterns.zulauf as keyof typeof guides].sourceDocument).toBe(m.manual);
    }
  });
});

describe('Gerätekatalog', () => {
  const g5833 = {
    manufacturerId: 'miele',
    model: 'G 5833 SC',
    category: 'geschirrspueler' as const,
  };

  test('Suche findet Modelle auch ohne Leerzeichen und nach Gerätetyp', () => {
    expect(searchCatalog('g5833', label).map((c) => c.id)).toEqual(['miele-g5833sc']);
    expect(searchCatalog('smi4eas', label).map((c) => c.id)).toEqual(['bosch-smi4eas24e']);
    expect(searchCatalog('geschirr', label)).toHaveLength(2);
    expect(searchCatalog('', label)).toHaveLength(catalog.length);
  });

  test('Geschirrspüler aus dem Katalog hat Anleitungen, andere Geschirrspüler nicht', () => {
    expect(findModel(g5833)?.id).toBe('miele-g5833sc');
    expect(hasGuides(g5833)).toBe(true);
    expect(hasGuides({ ...g5833, model: 'G 1234' })).toBe(false);
    expect(deviceGuides(g5833)?.care).toBe(false);
  });

  test('Fehlererkennung führt zur Anleitung des Geräts', () => {
    expect(guideForDevice(g5833, 'ablauf')).toBe('g5833_ablauf');
    expect(
      guideForDevice({ ...g5833, model: 'WKB 130', category: 'waschmaschine' }, 'ablauf'),
    ).toBe('ablauf');
  });

  test('Reparatur-Assistent schlägt nur Anleitungen des Geräts vor', () => {
    const raw = (id: string) =>
      JSON.stringify({ reply: 'x', suggestion: 'anleitung', guideId: id });
    const ctx = { category: 'geschirrspueler' as const, guideIds: ['g5833_ablauf'] };
    expect(parseReply(raw('g5833_ablauf'), ctx)?.suggestion).toBe('anleitung');
    expect(parseReply(raw('ablauf'), ctx)?.suggestion).toBe('keine');
    expect(parseReply(raw('g5833_ablauf'), 'waschmaschine')?.suggestion).toBe('keine');
  });
});
