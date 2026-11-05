// Fristen nur in Servicezeiten (Portal-Idee 4): Mo bis Sa 8 bis 18 Uhr, Berlin
import { fruendSettings } from '@/config/portal.demo';
import { addServiceTime, serviceTime, sla } from '@/portal/lib/sla';
import { seedRecords } from '@/server/backend/seed';

const H = 3_600_000;
const hours = { days: [1, 2, 3, 4, 5, 6], from: '08:00', to: '18:00' };
const at = (iso: string) => Date.parse(iso);

describe('Fristen in Servicezeiten', () => {
  it('zählt nur Servicezeit, auch über Sonntag und die Zeitumstellung', () => {
    // Fr 06.11.2026 17:00 bis Sa 09:00: 1 Std. Freitag, 1 Std. Samstag
    expect(
      serviceTime(at('2026-11-06T17:00:00+01:00'), at('2026-11-07T09:00:00+01:00'), hours),
    ).toBe(2 * H);
    // Sa 17:00 plus 4 Std.: 1 Std. Samstag, Sonntag zu, Montag 8 bis 11
    expect(addServiceTime(at('2026-11-07T17:00:00+01:00'), 4 * H, hours)).toBe(
      at('2026-11-09T11:00:00+01:00'),
    );
    // Nachts gemeldet: die Frist beginnt um 8
    expect(addServiceTime(at('2026-11-05T22:00:00+01:00'), 4 * H, hours)).toBe(
      at('2026-11-06T12:00:00+01:00'),
    );
    // Sommerzeit endet am 25.10.2026: Samstag 24.10. 17:00 plus 2 Std. ist Montag 9:00 (MEZ)
    expect(addServiceTime(at('2026-10-24T17:00:00+02:00'), 2 * H, hours)).toBe(
      at('2026-10-26T09:00:00+01:00'),
    );
  });

  it('ruht außerhalb der Servicezeit und wird nicht über Nacht überfällig', () => {
    const r = seedRecords(at('2026-11-05T09:00:00+01:00')).find(
      (x) => x.workflow?.status === 'neu',
    )!;
    const neu = {
      ...r,
      file: { ...r.file, sharedAt: '2026-11-07T17:30:00+01:00' },
      workflow: { status: 'neu' as const, since: '2026-11-07T17:30:00+01:00' },
    };
    const rules = { ...fruendSettings.rules, slaFirstHours: 4 };
    // Sonntagmittag: ohne Servicezeiten längst überfällig, mit ihnen noch 3,5 Std., ruht
    const sunday = at('2026-11-08T12:00:00+01:00');
    expect(sla(neu, rules, sunday)!.tone).toBe('over');
    const timed = sla(neu, rules, sunday, hours)!;
    expect(timed).toMatchObject({ tone: 'ok', left: 3.5 * H, paused: true });
    expect(timed.dueAt).toBe(new Date(at('2026-11-09T11:30:00+01:00')).toISOString());
    // Montag 11:00: knapp, läuft
    const monday = sla(neu, rules, at('2026-11-09T11:00:00+01:00'), hours)!;
    expect(monday).toMatchObject({ tone: 'warn', left: 0.5 * H });
    expect(monday.paused).toBeUndefined();
    // Montag 13:00: 1,5 Std. überfällig
    expect(sla(neu, rules, at('2026-11-09T13:00:00+01:00'), hours)).toMatchObject({
      tone: 'over',
      left: -1.5 * H,
    });
  });
});
