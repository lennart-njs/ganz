// Gewährleistungsprüfung aus Kaufdatum, Kaufbeleg, Versicherung und den Regeln des Händlers.
// Nur ein Vorschlag: Entscheiden tut das Team mit einem Klick.
import type { DealerSettings } from '@/model/portal';
import type { RetailerDecision, SharedCaseFile } from '@/model/sharing';

const MONTH = 30.44 * 86_400_000;

export interface WarrantyCheck {
  verdict: RetailerDecision;
  /** Alter des Geräts beim Melden des Problems, in Monaten */
  months?: number;
  proof: boolean;
}

export function warrantyCheck(file: SharedCaseFile, rules: DealerSettings['rules']): WarrantyCheck {
  const proof = file.photos.some((p) => p.purpose === 'kaufbeleg');
  const bought = file.device.purchaseDate ? Date.parse(file.device.purchaseDate) : NaN;
  const months = Number.isNaN(bought)
    ? undefined
    : Math.max(0, Math.floor((Date.parse(file.case.createdAt) - bought) / MONTH));
  const cost = file.quote?.repair.total;
  let verdict: RetailerDecision;
  if (months !== undefined && months < rules.warrantyMonths) verdict = 'gewaehrleistung';
  else if (
    months !== undefined &&
    months < rules.warrantyMonths + rules.goodwillMonths &&
    (cost === undefined || cost <= rules.goodwillMaxCents)
  )
    verdict = 'kulanz';
  else if (file.protection) verdict = 'an_versicherer';
  else verdict = 'abgelehnt';
  return { verdict, months, proof };
}
