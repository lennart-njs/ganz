// Wer über die Kosten entscheidet (Regulierer), aus den Daten des Geräts. Nach Lennart gelten
// ganz Nr. 31 bis 34 je Regulierer: Versicherer, Händler oder Hersteller. Selbstzahlen heißt: keiner.
// Die Liste ist geordnet: Gewährleistung, Garantie, Versicherung, Kulanz, Reparaturpflicht,
// Selbstzahlen (U10). Die Reihenfolge ist ein Vorschlag, bis Lennart sie festlegt.
// Zwei Gewährleistungen, getrennt benannt: hier die des Händlers auf den Kauf
// (purchaseWarrantyMonths), in warranty.ts die auf eine Reparatur (ganz Nr. 32).
// Noch ohne Aufrufer (Schritt 4.1). Werte und Stichtag gibt der Aufrufer mit.
// Kein Import aus react, expo, i18n, config oder store (ZUKUNFTSPLAN 3.1).
import type {
  Contract,
  ConsentPurpose,
  CoverageBasis,
  Device,
  ISODateTime,
  Id,
  PartnerRef,
  RegulatorKind,
  RegulatorRef,
} from '../types';
import { addMonths } from './warranty';

export interface RegulatorRules {
  /**
   * Gewährleistung des Händlers auf den Kauf, in Monaten (§ 438 Abs. 1 Nr. 3 BGB). Annahme: ab
   * Kaufdatum. Das Gesetz nennt die Ablieferung (§ 438 Abs. 2 BGB), die kennt die App nicht.
   * In der App: warranty.purchaseMonths.
   */
  readonly purchaseWarrantyMonths: number;
  /**
   * Gerätearten mit Reparaturpflicht des Herstellers (§§ 479a ff. BGB, Rechtsfragen 28 bis 30).
   * Leer bis zur Antwort des Anwalts.
   */
  readonly rightToRepair: readonly Device['category'][];
}

export const DEFAULT_REGULATOR_RULES: RegulatorRules = {
  purchaseWarrantyMonths: 24,
  rightToRepair: [],
};

export interface RegulatorInput {
  readonly device: Pick<Device, 'soldBy' | 'purchaseDate' | 'category' | 'manufacturerId'>;
  /** Der Vertrag des Geräts (device.contractId), falls es einen gibt */
  readonly contract?: Pick<Contract, 'id' | 'provider' | 'validFrom' | 'validUntil'>;
  /** Stichtag: wann das Problem gemeldet wurde (Case.createdAt), wie portal/lib/check.ts */
  readonly asOf: ISODateTime;
  readonly rules: RegulatorRules;
}

interface OptionBase {
  /**
   * sicher: Die Daten zeigen, dass die Grundlage am Stichtag besteht. pruefen: Das klärt der
   * Regulierer, etwa ohne Kaufdatum. Beides sagt keine Kosten zu.
   */
  readonly certainty: 'sicher' | 'pruefen';
  /** Ende der Grundlage, wo die Daten es kennen: Gewährleistung, Garantie, Versicherung */
  readonly until?: ISODateTime;
  /** Bei Herstellergarantie und Versicherung */
  readonly contractId?: Id;
  /** Der Regulierer schickt selbst einen Betrieb (Händler, Hersteller). Dann bucht der Haushalt keinen. */
  readonly arranges: boolean;
  /** Braucht die Meldung einen Kostenvoranschlag? Nur beim Versicherer (R-02). */
  readonly needsQuote: boolean;
}

export type RegulatorOption =
  | (OptionBase & {
      readonly kind: RegulatorKind;
      readonly basis: CoverageBasis;
      /** Der Name ist nur Kennung. Die Anzeige nimmt ihn aus lib/service.ts. */
      readonly party: RegulatorRef;
    })
  | (OptionBase & {
      readonly kind: 'haushalt';
      readonly basis: 'selbstzahler';
      readonly party?: undefined;
    });

/**
 * Zweck der Bestätigung, mit der der Haushalt an den Regulierer meldet, je Empfänger ein eigener.
 * Für den Hersteller gibt es den Zweck noch nicht (Schritt 5.4). Ohne Zweck keine Meldung an ihn.
 * hersteller_einzelfall passt nicht: Das ist eine Einwilligung für Erkenntnisse zum Produkt.
 */
export const REGULATOR_CONSENT: Readonly<Record<RegulatorKind, ConsentPurpose | null>> = {
  versicherer: 'weitergabe_versicherer',
  haendler: 'weitergabe_haendler',
  hersteller: null,
};

/** Zeitpunkt in ms, ohne lesbares Datum undefined */
function time(iso: ISODateTime | undefined): number | undefined {
  if (iso === undefined) return undefined;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? undefined : t;
}

/**
 * Läuft die Gewährleistung auf den Kauf am Stichtag noch? Bis einschließlich Kaufdatum plus months,
 * in Kalendermonaten (addMonths, § 188 Abs. 3 BGB), nicht in Tagen. Ohne lesbares Datum: nein.
 */
export function withinPurchaseWarranty(
  purchase: ISODateTime,
  asOf: ISODateTime,
  months: number,
): boolean {
  const at = time(asOf);
  if (time(purchase) === undefined || at === undefined) return false;
  return at <= Date.parse(addMonths(purchase, months));
}

function asRegulator(ref: PartnerRef, kind: RegulatorKind): RegulatorRef | undefined {
  return ref.kind === kind ? { id: ref.id, kind, name: ref.name } : undefined;
}

/**
 * Wer die Kosten übernehmen kann, geordnet (regulierer §1.2). Selbstzahlen steht immer am Ende.
 * 1. Händler, Gewährleistung: sicher, wenn der Stichtag in der Frist liegt. Ohne lesbares
 *    Kaufdatum pruefen, dann prüft der Händler.
 * 2. Hersteller, Herstellergarantie: ein Vertrag des Herstellers, gültig am Stichtag.
 * 3. Versicherer, Versicherung: ein Vertrag des Versicherers, gültig am Stichtag.
 * 4. Händler, Kulanz: Der Kauf liegt länger zurück als die Frist. Die App sagt nichts zu, der
 *    Händler entscheidet nach seinen Regeln.
 * 5. Hersteller, Reparaturpflicht: Die Geräteart steht in rules.rightToRepair, und die
 *    Gewährleistung ist nicht sicher. Der Haushalt zahlt dann den Preis des Herstellers.
 * 6. Selbstzahlen.
 * Den Vertrag ordnet sein Anbieter zu, nicht die Produktart: Eine Garantieverlängerung des
 * Herstellers ist eine Herstellergarantie, eine des Versicherers eine Versicherung.
 */
export function regulatorOptions(i: RegulatorInput): RegulatorOption[] {
  const { device, contract, asOf, rules } = i;
  const months = rules.purchaseWarrantyMonths;
  const at = time(asOf);
  const options: RegulatorOption[] = [];

  const dealer = device.soldBy ? asRegulator(device.soldBy, 'haendler') : undefined;
  const purchase = time(device.purchaseDate) === undefined ? undefined : device.purchaseDate;
  let kulanz: RegulatorOption | undefined;
  let warrantySure = false;
  if (dealer) {
    const base = { kind: 'haendler', party: dealer, arranges: true, needsQuote: false } as const;
    if (purchase === undefined || at === undefined) {
      options.push({ ...base, basis: 'gewaehrleistung', certainty: 'pruefen' });
    } else if (withinPurchaseWarranty(purchase, asOf, months)) {
      warrantySure = true;
      options.push({
        ...base,
        basis: 'gewaehrleistung',
        certainty: 'sicher',
        until: addMonths(purchase, months),
      });
    } else {
      kulanz = { ...base, basis: 'kulanz', certainty: 'pruefen' };
    }
  }

  const from = time(contract?.validFrom);
  const to = time(contract?.validUntil);
  if (
    contract &&
    at !== undefined &&
    from !== undefined &&
    to !== undefined &&
    from <= at &&
    at <= to
  ) {
    const base = {
      certainty: 'sicher',
      until: contract.validUntil,
      contractId: contract.id,
    } as const;
    const maker = asRegulator(contract.provider, 'hersteller');
    const insurer = asRegulator(contract.provider, 'versicherer');
    if (maker) {
      options.push({
        ...base,
        kind: 'hersteller',
        basis: 'herstellergarantie',
        party: maker,
        arranges: true,
        needsQuote: false,
      });
    } else if (insurer) {
      options.push({
        ...base,
        kind: 'versicherer',
        basis: 'versicherung',
        party: insurer,
        arranges: false,
        needsQuote: true,
      });
    }
  }

  if (kulanz) options.push(kulanz);

  if (!warrantySure && device.manufacturerId && rules.rightToRepair.includes(device.category)) {
    options.push({
      kind: 'hersteller',
      basis: 'reparaturpflicht',
      // Das Gerät kennt nur die Kennung des Herstellers. Den Namen zeigt die App aus dem Katalog.
      party: { id: device.manufacturerId, kind: 'hersteller', name: device.manufacturerId },
      certainty: 'pruefen',
      arranges: true,
      needsQuote: false,
    });
  }

  options.push({
    kind: 'haushalt',
    basis: 'selbstzahler',
    certainty: 'sicher',
    arranges: false,
    needsQuote: false,
  });
  return options;
}
