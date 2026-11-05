// Kulanz mit Betrag (Portal-Idee 2): Parser, Belegzeile in App und Portal
import { de } from '@/i18n/de';
import { formatEuro } from '@/i18n/format';
import { goodwillLine } from '@/lib/goodwill';
import { goodwillShare, parseRetailerAction } from '@/model/sharing';

describe('Kulanz mit Betrag', () => {
  it('nimmt Beträge nur bei Kulanz, ganze Cent, Voranschlag nicht kleiner als der Betrag', () => {
    const base = { type: 'entscheidung', decision: 'kulanz' };
    expect(parseRetailerAction({ ...base, coverCents: 18000, totalCents: 24400 })).toEqual({
      ...base,
      coverCents: 18000,
      totalCents: 24400,
    });
    expect(parseRetailerAction({ ...base, coverCents: 18000 })).toEqual({
      ...base,
      coverCents: 18000,
    });
    expect(parseRetailerAction({ ...base, decision: 'gewaehrleistung', coverCents: 1 })).toBeNull();
    expect(parseRetailerAction({ ...base, coverCents: 1.5 })).toBeNull();
    expect(parseRetailerAction({ ...base, coverCents: -1 })).toBeNull();
    expect(parseRetailerAction({ ...base, coverCents: 2_000_000 })).toBeNull();
    expect(parseRetailerAction({ ...base, coverCents: 500, totalCents: 400 })).toBeNull();
    expect(parseRetailerAction({ ...base, totalCents: 400 })).toBeNull();
    // Ohne Betrag wie bisher
    expect(parseRetailerAction(base)).toEqual(base);
  });

  it('rechnet den Rest aus dem Voranschlag', () => {
    expect(goodwillShare({ decision: 'kulanz', coverCents: 18000, totalCents: 24400 })).toEqual({
      cover: 18000,
      rest: 6400,
    });
    expect(goodwillShare({ decision: 'kulanz', coverCents: 18000 })).toEqual({ cover: 18000 });
    expect(goodwillShare({ decision: 'gewaehrleistung', coverCents: 18000 })).toBeUndefined();
    expect(goodwillShare({ decision: 'kulanz', coverCents: '18000' })).toBeUndefined();
  });

  it('zeigt eine Zeile wie einen Beleg', () => {
    const t = de.sharing.goodwill;
    expect(
      goodwillLine('Fründ', { decision: 'kulanz', coverCents: 18000, totalCents: 24400 }),
    ).toBe(t.split('Fründ', formatEuro(18000), formatEuro(6400)));
    expect(
      goodwillLine('Fründ', { decision: 'kulanz', coverCents: 24400, totalCents: 24400 }),
    ).toBe(t.split('Fründ', formatEuro(24400), formatEuro(0)));
    expect(goodwillLine('Fründ', { decision: 'kulanz', coverCents: 25000 })).toBe(
      t.upTo('Fründ', formatEuro(25000)),
    );
    expect(goodwillLine('Fründ', { decision: 'abgelehnt' })).toBeUndefined();
    expect(t.split('Fründ', formatEuro(18000), formatEuro(6400)).replace(/\u00a0/g, ' ')).toBe(
      'Fründ übernimmt 180 €, du zahlst 64 €.',
    );
  });
});
