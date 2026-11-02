// Datum und Beträge wie in der App: „Mo, 02.11. · 14:20“, „189 €“. Zeitzone Berlin.
const tz = 'Europe/Berlin';
const date = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: tz,
});
const day = new Intl.DateTimeFormat('de-DE', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  timeZone: tz,
});
const time = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: tz });
const euro = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

export const formatDate = (iso: string) => date.format(new Date(iso));
export const formatWhen = (iso: string) =>
  `${day.format(new Date(iso))} · ${time.format(new Date(iso))}`;
export const formatEuro = (cents: number) => euro.format(cents / 100);

/** Gewährleistung: 2 Jahre ab Kauf (§ 438 BGB). Nur zur Orientierung. */
export function warrantyEnd(purchase: string): { until: string; running: boolean } {
  const d = new Date(purchase);
  d.setFullYear(d.getFullYear() + 2);
  return { until: formatDate(d.toISOString()), running: d.getTime() > Date.now() };
}
