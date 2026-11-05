// Prüfung aus Kaufdatum, Kaufbeleg, Versicherung und den Regeln des Händlers. Nur ein Vorschlag:
// Entscheiden tut das Team mit einem Klick.
//
// Die Frist auf den Kauf rechnet wie die App (model/policies/regulator.ts): 24 Monate nach
// Kalendermonaten, bis zum Ende des Tages in Berlin, Stichtag ist das Melden des Problems. Der
// Händler kann sie nicht verkürzen, sie ist gesetzlich (§ 438 BGB). Die Reihenfolge folgt U10:
// Gewährleistung, Versicherung, Kulanz.
import type { DealerSettings } from '@/model/portal';
import {
  DEFAULT_REGULATOR_RULES,
  fullCalendarMonths,
  purchaseWarrantyUntil,
  withinPurchaseWarranty,
} from '@/model/policies/regulator';
import type { RetailerDecision, SharedCaseFile, SharedCaseRecord } from '@/model/sharing';

/** Ohne lesbares Kaufdatum schlägt die Prüfung nichts vor: offen */
export type Verdict = RetailerDecision | 'offen';

export interface WarrantyCheck {
  verdict: Verdict;
  /** Volle Kalendermonate zwischen Kauf und Melden */
  months?: number;
  /** Ende der Gewährleistung auf den Kauf */
  until?: string;
  proof: boolean;
}

/** Gesetzliche Frist auf den Kauf, gleich mit der App */
export const PURCHASE_WARRANTY_MONTHS = DEFAULT_REGULATOR_RULES.purchaseWarrantyMonths;

/** Volle Kalendermonate von purchase bis asOf, nach der Regel der App. Ohne lesbare Daten undefined. */
export function fullMonths(purchase: string, asOf: string): number | undefined {
  return fullCalendarMonths(purchase, asOf);
}

export function warrantyCheck(
  file: SharedCaseFile,
  rules: DealerSettings['rules'],
  record?: Pick<SharedCaseRecord, 'proofPhotoId'>,
): WarrantyCheck {
  const proof =
    file.photos.some((p) => p.purpose === 'kaufbeleg') ||
    (!!record?.proofPhotoId && file.photos.some((p) => p.id === record.proofPhotoId));
  const asOf = file.case.createdAt;
  const purchase = file.device.purchaseDate;
  const months = purchase ? fullMonths(purchase, asOf) : undefined;
  if (!purchase || months === undefined) return { verdict: 'offen', proof };
  const until = purchaseWarrantyUntil(purchase, PURCHASE_WARRANTY_MONTHS);
  if (withinPurchaseWarranty(purchase, asOf, PURCHASE_WARRANTY_MONTHS))
    return { verdict: 'gewaehrleistung', months, until, proof };
  const at = Date.parse(asOf);
  const insured = !!file.protection && Date.parse(file.protection.validUntil) >= at;
  if (insured) return { verdict: 'an_versicherer', months, until, proof };
  const cost = file.quote?.repair.total;
  const goodwill =
    months < PURCHASE_WARRANTY_MONTHS + rules.goodwillMonths &&
    (cost === undefined || cost <= rules.goodwillMaxCents);
  return { verdict: goodwill ? 'kulanz' : 'abgelehnt', months, until, proof };
}
