// Nachbesserung im Portal (Portal-Idee 3): dasselbe Gerät, frühere Reparatur in der Frist
import { fruendSettings } from '@/config/portal.demo';
import { addMonths } from '@/model/policies/warranty';
import type { SharedCaseRecord } from '@/model/sharing';
import { allowedDecisions, warrantyCheck } from '@/portal/lib/check';
import { nextStep } from '@/portal/lib/next';
import { previousRepair } from '@/portal/lib/rework';
import { seedRecords } from '@/server/backend/seed';

const NOW = Date.parse('2026-11-05T09:00:00+01:00');
const base = seedRecords(NOW).find((x) => x.workflow?.status === 'neu')!;

function record(
  caseId: string,
  createdAt: string,
  extra: Partial<SharedCaseRecord> = {},
  serialNumber = 'SN-1',
): SharedCaseRecord {
  return {
    ...base,
    retailerEvents: [],
    revokedAt: undefined,
    ...extra,
    file: {
      ...base.file,
      caseId,
      case: { ...base.file.case, createdAt },
      device: { ...base.file.device, serialNumber, purchaseDate: '2020-01-01T12:00:00+01:00' },
    },
  };
}

const event = (type: string, at: string, payload: Record<string, unknown>) =>
  ({ id: `${type}-${at}`, type, at, actor: { kind: 'haendler' }, payload }) as never;

/** Früherer Fall: Gewährleistung zugesagt, am 10.01.2026 abgeschlossen */
const repaired = record('GS-1', '2026-01-02T10:00:00+01:00', {
  workflow: { status: 'erledigt', since: '2026-01-10T15:00:00+01:00' },
  retailerEvents: [
    event('haendler_entscheidung', '2026-01-03T10:00:00+01:00', { decision: 'gewaehrleistung' }),
    event('haendler_status', '2026-01-10T15:00:00+01:00', { status: 'abgeschlossen' }),
  ],
});

describe('Nachbesserung im Portal', () => {
  it('erkennt dasselbe Gerät mit Reparatur in der Frist', () => {
    const now = record('GS-2', '2026-11-04T10:00:00+01:00');
    expect(previousRepair(now, [repaired, now], 24)).toEqual({
      caseId: 'GS-1',
      doneAt: '2026-01-10T15:00:00+01:00',
      until: addMonths('2026-01-10T15:00:00+01:00', 24),
    });
  });

  it('nicht bei anderem Gerät, ohne Reparatur, nach der Frist oder für sich selbst', () => {
    const other = record('GS-2', '2026-11-04T10:00:00+01:00', {}, 'SN-2');
    expect(previousRepair(other, [repaired, other], 24)).toBeUndefined();
    const late = record('GS-3', '2028-02-01T10:00:00+01:00');
    expect(previousRepair(late, [repaired, late], 24)).toBeUndefined();
    const rejected = {
      ...repaired,
      retailerEvents: [
        event('haendler_entscheidung', '2026-01-03T10:00:00+01:00', { decision: 'abgelehnt' }),
      ],
    };
    const now = record('GS-2', '2026-11-04T10:00:00+01:00');
    expect(previousRepair(now, [rejected, now], 24)).toBeUndefined();
    expect(previousRepair(repaired, [repaired], 24)).toBeUndefined();
    // Ohne Seriennummer keine Zuordnung
    const blank = record('GS-4', '2026-11-04T10:00:00+01:00', {}, ' ');
    expect(previousRepair(blank, [repaired, blank], 24)).toBeUndefined();
  });

  it('macht aus abgelaufener Frist auf den Kauf eine Gewährleistung auf die Reparatur', () => {
    const now = record('GS-2', '2026-11-04T10:00:00+01:00', {
      workflow: { status: 'wartet_uns', since: '2026-11-04T10:00:00+01:00' },
    });
    const rework = previousRepair(now, [repaired, now], 24);
    const plain = warrantyCheck(now.file, fruendSettings.rules, now);
    expect(plain.inWarranty).toBe(false);
    const check = warrantyCheck(now.file, fruendSettings.rules, now, rework);
    expect(check).toMatchObject({ verdict: 'gewaehrleistung', inWarranty: true, rework });
    expect(allowedDecisions(check)).toContain('gewaehrleistung');
    expect(allowedDecisions(check)).not.toContain('kulanz');
    expect(nextStep(now, fruendSettings, rework)).toEqual({
      kind: 'entscheiden',
      decision: 'gewaehrleistung',
    });
  });

  it('die Beispielfälle zeigen genau eine Nachbesserung, außerhalb der Frist auf den Kauf', () => {
    for (const now of [NOW, Date.parse('2026-11-06T18:00:00+01:00')]) {
      const all = seedRecords(now);
      const hits = all.filter((r) => previousRepair(r, all));
      expect(hits).toHaveLength(1);
      const r = hits[0]!;
      const twin = all.find((x) => x.file.caseId === previousRepair(r, all)!.caseId)!;
      expect(twin.file.customer).toEqual(r.file.customer);
      expect(warrantyCheck(r.file, fruendSettings.rules, r).inWarranty).toBe(false);
      expect(warrantyCheck(r.file, fruendSettings.rules, r, previousRepair(r, all)).verdict).toBe(
        'gewaehrleistung',
      );
    }
  });
});
