// Herstelleranfrage (Portal-Idee 5): Garantie- oder Teileanfrage beim Hersteller, vorausgefüllt
// aus der Fallakte. Noch ohne Anbindung (Vorschau): Das Team kopiert den Text in das Portal des
// Herstellers. Nur Daten zum Gerät und zum Fehler, nichts zur Person der Kundschaft: Die
// Einwilligung gilt der Weitergabe an den Händler, nicht an den Hersteller.
import { de } from '@/i18n/de';
import type { SharedCaseRecord } from '@/model/sharing';

import type { WarrantyCheck } from './check';
import { formatDate } from './format';
import { photoLabel } from './photos';
import { decisionOf } from './view';

const t = de.portal;

export interface Claim {
  facts: [string, string][];
  text: string;
}

export function manufacturerClaim(
  r: SharedCaseRecord,
  check: WarrantyCheck,
  dealer: string,
): Claim {
  const f = r.file;
  const result = f.results.at(-1);
  const part = r.retailerEvents.findLast((e) => e.type === 'haendler_ersatzteil')?.payload.part;
  const decided = decisionOf(r);
  const basis = decided ? t.decisions[decided] : t.check.verdict[check.verdict];
  const facts: [string, string | undefined][] = [
    [t.claim.manufacturer, f.device.manufacturer],
    [t.file.model, `${f.device.model} · ${f.device.categoryLabel}`],
    [t.file.materialNumber, f.device.materialNumber],
    [t.file.serialNumber, f.device.serialNumber],
    [
      t.file.purchased,
      f.device.purchaseDate ? t.claim.bought(formatDate(f.device.purchaseDate), dealer) : undefined,
    ],
    [t.claim.fault, f.case.problemLabel],
    [t.claim.display, result?.displayMessage],
    [t.claim.component, result?.component],
    [t.file.finding, f.finding?.label],
    [t.claim.part, part ? String(part) : undefined],
    [t.check.basis, check.rework ? t.check.reworkChip : basis],
    [
      t.file.photos,
      f.photos.length ? [...new Set(f.photos.map((p) => photoLabel(f, p)))].join(', ') : undefined,
    ],
  ];
  const rows = facts.filter((x): x is [string, string] => !!x[1]);
  return {
    facts: rows,
    text: [t.claim.subject(f.caseId), ...rows.map(([k, v]) => `${k}: ${v}`)].join('\n'),
  };
}
