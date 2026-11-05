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
import {
  retailerDecisions,
  type RetailerDecision,
  type SharedCaseFile,
  type SharedCaseRecord,
} from '@/model/sharing';

import type { PreviousRepair } from './rework';

/** Ohne lesbares Kaufdatum schlägt die Prüfung nichts vor: offen */
export type Verdict = RetailerDecision | 'offen';

export interface WarrantyCheck {
  verdict: Verdict;
  /** Volle Kalendermonate zwischen Kauf und Melden */
  months?: number;
  /** Ende der Gewährleistung auf den Kauf */
  until?: string;
  proof: boolean;
  /** Gewährleistung auf den Kauf am Stichtag. Ohne lesbares Kaufdatum undefined. */
  inWarranty?: boolean;
  /** Versicherung am Stichtag gültig */
  insured: boolean;
  /** Nachbesserung: eine frühere Reparatur am selben Gerät, deren Gewährleistung noch läuft */
  rework?: PreviousRepair;
}

/** Gesetzliche Frist auf den Kauf, gleich mit der App */
export const PURCHASE_WARRANTY_MONTHS = DEFAULT_REGULATOR_RULES.purchaseWarrantyMonths;

/** Volle Kalendermonate von purchase bis asOf, nach der Regel der App. Ohne lesbare Daten undefined. */
export function fullMonths(purchase: string, asOf: string): number | undefined {
  return fullCalendarMonths(purchase, asOf);
}

/**
 * Prüfung eines Falls. Mit rework (portal/lib/rework.ts) ist er eine Nachbesserung: Gewährleistung
 * auf die frühere Reparatur, gleich wie die Frist auf den Kauf steht.
 */
export function warrantyCheck(
  file: SharedCaseFile,
  rules: DealerSettings['rules'],
  record?: Pick<SharedCaseRecord, 'proofPhotoId'>,
  rework?: PreviousRepair,
): WarrantyCheck {
  const c = purchaseCheck(file, rules, record);
  return rework ? { ...c, verdict: 'gewaehrleistung', inWarranty: true, rework } : c;
}

function purchaseCheck(
  file: SharedCaseFile,
  rules: DealerSettings['rules'],
  record?: Pick<SharedCaseRecord, 'proofPhotoId'>,
): WarrantyCheck {
  const proof =
    file.photos.some((p) => p.purpose === 'kaufbeleg') ||
    (!!record?.proofPhotoId && file.photos.some((p) => p.id === record.proofPhotoId));
  const asOf = file.case.createdAt;
  const insured = !!file.protection && Date.parse(file.protection.validUntil) >= Date.parse(asOf);
  const purchase = file.device.purchaseDate;
  const months = purchase ? fullMonths(purchase, asOf) : undefined;
  if (!purchase || months === undefined) return { verdict: 'offen', proof, insured };
  const until = purchaseWarrantyUntil(purchase, PURCHASE_WARRANTY_MONTHS);
  const base = { months, until, proof, insured };
  if (withinPurchaseWarranty(purchase, asOf, PURCHASE_WARRANTY_MONTHS))
    return { verdict: 'gewaehrleistung', ...base, inWarranty: true };
  if (insured) return { verdict: 'an_versicherer', ...base, inWarranty: false };
  const cost = file.quote?.repair.total;
  const goodwill =
    months < PURCHASE_WARRANTY_MONTHS + rules.goodwillMonths &&
    (cost === undefined || cost <= rules.goodwillMaxCents);
  return { verdict: goodwill ? 'kulanz' : 'abgelehnt', ...base, inWarranty: false };
}

/**
 * Was die Regel zulässt, gleich mit der App (regulatorOptions): In der Gewährleistung keine Kulanz,
 * danach keine Gewährleistung, die Versicherung nur mit gültigem Vertrag. Ohne Kaufdatum
 * entscheidet der Händler nach dem Beleg. Ablehnen geht immer, mit Grund.
 */
export function allowedDecisions(c: Pick<WarrantyCheck, 'inWarranty' | 'insured'>) {
  return retailerDecisions.filter((d) => {
    if (d === 'gewaehrleistung') return c.inWarranty !== false;
    if (d === 'kulanz') return c.inWarranty !== true;
    if (d === 'an_versicherer') return c.insured;
    return true;
  });
}
