// Termine planen (Portal-Idee 4): Betrieb nach Postleitzahl, belegte Zeitfenster
import { fruendSettings } from '@/config/portal.demo';
import type { SharedCaseRecord } from '@/model/sharing';
import { partnerOptions, slotLoad } from '@/portal/lib/schedule';
import { seedRecords } from '@/server/backend/seed';

const s = fruendSettings;
const own = s.service.serviceName;

describe('Betrieb nach Postleitzahl', () => {
  it('im Gebiet zuerst der eigene Kundendienst, sonst die Partner, autorisierte zuerst', () => {
    const inside = partnerOptions(s, `${s.service.zipPrefixes[0]}49`);
    expect(inside[0]).toEqual({ name: own, own: true, inArea: true });
    const outside = partnerOptions(s, '10115');
    expect(outside.at(-1)).toEqual({ name: own, own: true, inArea: false });
    const partners = outside.filter((p) => !p.own).map((p) => p.name);
    const authorized = s.service.partners.filter((p) => p.authorized).map((p) => p.name);
    expect(partners.slice(0, authorized.length)).toEqual(authorized);
    // Ohne Postleitzahl: Reihenfolge wie bisher, ohne Aussage zum Gebiet
    expect(partnerOptions(s)[0]).toEqual({ name: own, own: true });
  });
});

describe('Belegte Zeitfenster', () => {
  const records = seedRecords(Date.parse('2026-11-05T09:00:00+01:00'));
  it('zählt bestätigte Termine in offenen Fällen je Betrieb', () => {
    const base = records.find((r) => r.workflow?.status === 'neu')!;
    const booked = (id: string, status: 'termin' | 'erledigt'): SharedCaseRecord => ({
      ...base,
      file: { ...base.file, caseId: id },
      workflow: { status, since: base.file.sharedAt },
      retailerEvents: [
        {
          id: `b-${id}`,
          caseId: id,
          type: 'haendler_betrieb',
          at: base.file.sharedAt,
          actor: { kind: 'haendler' },
          payload: { partnerName: own, slot: 'Mo, 8–12 Uhr' },
        },
      ],
    });
    const load = slotLoad([booked('A', 'termin'), booked('B', 'termin'), booked('C', 'erledigt')]);
    expect(load).toEqual({ [own]: { 'Mo, 8–12 Uhr': 2 } });
  });

  it('die Beispielfälle belegen nur Fenster, die es gibt', () => {
    const load = slotLoad(records);
    for (const row of Object.values(load))
      for (const slot of Object.keys(row)) expect(s.service.slots).toContain(slot);
  });
});
