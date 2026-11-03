// Servicezeiten lesbar: „Mo–Sa, 8–18 Uhr“. Gleich in App und Händlerportal.
import { de } from '@/i18n/de';
import type { DealerSettings } from '@/model/portal';

const time = (hm: string) => {
  const [h = '0', m = '00'] = hm.split(':');
  return m === '00' ? String(Number(h)) : `${Number(h)}:${m}`;
};

/** Wochentage (1 = Montag) zu Bereichen: [1,2,3,4,5,6] → „Mo–Sa“, [1,3] → „Mo, Mi“ */
export function formatDays(days: number[]): string {
  const sorted = [...new Set(days)].filter((d) => d >= 1 && d <= 7).sort((a, b) => a - b);
  const name = (d: number) => de.sharing.hours.days[d - 1] ?? '';
  const parts: string[] = [];
  for (let i = 0; i < sorted.length;) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j]! + 1) j++;
    const from = sorted[i]!;
    const to = sorted[j]!;
    parts.push(
      j - i >= 2
        ? `${name(from)}–${name(to)}`
        : sorted
            .slice(i, j + 1)
            .map(name)
            .join(', '),
    );
    i = j + 1;
  }
  return parts.join(', ');
}

export function formatServiceHours(hours: DealerSettings['profile']['hours']): string {
  return `${formatDays(hours.days)}, ${de.sharing.hours.range(time(hours.from), time(hours.to))}`;
}
