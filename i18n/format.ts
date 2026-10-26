import type { Cents, ISODateTime } from '@/model/types';

const euro = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** 18900 → „189 €“ */
export function formatEuro(cents: Cents): string {
  return euro.format(cents / 100);
}

/** „Mo, 26.10. · 19:42“ wie im Designsystem */
export function formatDateTime(iso: ISODateTime): string {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat('de-DE', { weekday: 'short' }).format(d).replace('.', '');
  const date = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit' }).format(d);
  const time = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(d);
  return `${day}, ${date} · ${time}`;
}

/** „03/2023“ */
export function formatMonthYear(iso: ISODateTime): string {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

/** 2.4 → „2,4“ */
export function formatDecimal(n: number): string {
  return new Intl.NumberFormat('de-DE').format(n);
}
