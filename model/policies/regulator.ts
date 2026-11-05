// Wer über die Kosten entscheidet (Regulierer), aus den Daten des Geräts. Nach Lennart gelten
// ganz Nr. 31 bis 34 je Regulierer: Versicherer, Händler oder Hersteller. Selbstzahlen heißt: keiner.
// Die Liste ist geordnet: Gewährleistung, Garantie, Versicherung, Kulanz, Reparaturpflicht,
// Selbstzahlen (U10). Die Reihenfolge ist ein Vorschlag, bis Lennart sie festlegt.
// Zwei Gewährleistungen, getrennt benannt: hier die des Händlers auf den Kauf
// (purchaseWarrantyMonths), in warranty.ts die auf eine Reparatur (ganz Nr. 32).
// Aufrufer ist selectCaseFacts (caseFacts.ts). Werte und Stichtag gibt der Aufrufer mit.
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

export interface RegulatorRules {
  /**
   * Gewährleistung des Händlers auf den Kauf, in Monaten (§ 438 Abs. 1 Nr. 3 BGB). Annahme: ab
   * Kaufdatum. Das Gesetz nennt die Ablieferung (§ 438 Abs. 2 BGB), die kennt die App nicht.
   * Die Fakten nehmen DEFAULT_REGULATOR_RULES, gleich mit warranty.purchaseMonths
   * (config/demo.config.ts). Ein Test hält beide gleich.
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

/** Eine Möglichkeit mit Regulierer, also nicht Selbstzahlen */
export type Regulator = Exclude<RegulatorOption, { readonly kind: 'haushalt' }>;

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

/** Ein Kalendertag in Berlin, Monat 1 bis 12 */
interface Day {
  readonly y: number;
  readonly m: number;
  readonly d: number;
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** Letzter Sonntag im Monat month (1 bis 12) des Jahres y, 1 Uhr UTC */
function lastSundayOneUtc(y: number, month: number): number {
  // Tag 0 des Folgemonats ist der letzte Tag des Monats
  const last = Date.UTC(y, month, 0, 1);
  return last - new Date(last).getUTCDay() * DAY;
}

/**
 * Abstand der Berliner Uhr zu UTC zum Zeitpunkt t: im Winter 1 Stunde, im Sommer 2. Gerechnet,
 * nicht über Intl mit timeZone: Das lief unter Hermes (Expo Go) nie, und die Fakten jedes Falls mit
 * Kaufdatum hängen daran. Die Regel der EU gilt in Berlin seit 1981: Sommerzeit ab dem letzten
 * Sonntag im März, 1 Uhr UTC, bis 1995 bis zum letzten Sonntag im September, seit 1996 bis zum
 * letzten Sonntag im Oktober, jeweils 1 Uhr UTC. Vor 1981 rechnet die Funktion ohne Sommerzeit.
 * Für so alte Käufe ist die Frist lange abgelaufen, nur das Ende verschiebt sich um höchstens
 * eine Stunde. Ein Test vergleicht die Regel für die Jahre 1981 bis 2199 mit Intl in Node.
 */
export function berlinOffset(t: number): number {
  const y = new Date(t).getUTCFullYear();
  if (y < 1981) return HOUR;
  const start = lastSundayOneUtc(y, 3);
  const end = lastSundayOneUtc(y, y < 1996 ? 9 : 10);
  return t >= start && t < end ? 2 * HOUR : HOUR;
}

/** Kalendertag in Berlin zum Zeitpunkt t */
function berlinDay(t: number): Day {
  const wall = new Date(t + berlinOffset(t));
  return { y: wall.getUTCFullYear(), m: wall.getUTCMonth() + 1, d: wall.getUTCDate() };
}

/** Erster Zeitpunkt des Tages in Berlin. Mitternacht liegt nie in einer Zeitumstellung. */
function startOfBerlinDay({ y, m, d }: Day): number {
  const wall = Date.UTC(y, m - 1, d);
  return wall - berlinOffset(wall - berlinOffset(wall));
}

/**
 * Volle Kalendermonate vom Kauftag bis zum Stichtag, beide als Tag in Berlin. Kauf am 01.02.2024,
 * Stichtag 01.02.2026: 24, am 31.01.2026: 23. Für die Anzeige („16 Monate“), die Frist selbst
 * entscheidet withinPurchaseWarranty. Ohne lesbares Datum undefined, vor dem Kauf 0.
 */
export function fullCalendarMonths(purchase: ISODateTime, asOf: ISODateTime): number | undefined {
  const from = time(purchase);
  const to = time(asOf);
  if (from === undefined || to === undefined || from < FIRST_PURCHASE) return undefined;
  const a = berlinDay(from);
  const b = berlinDay(to);
  const months = (b.y - a.y) * 12 + (b.m - a.m) - (b.d < a.d ? 1 : 0);
  return Math.max(0, months);
}

/** Tag plus Monate. Fehlt der Tag im Zielmonat, gilt dessen letzter Tag (§ 188 Abs. 3 BGB). */
function addCalendarMonths({ y, m, d }: Day, months: number): Day {
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0));
  return {
    y: target.getUTCFullYear(),
    m: target.getUTCMonth() + 1,
    d: Math.min(d, last.getUTCDate()),
  };
}

/**
 * Kaufdaten, mit denen die Frist rechnet: vom Jahr 100 bis zum Jahr 9999. Davor macht Date.UTC
 * aus den Jahren 0 bis 99 die Jahre 1900 bis 1999. Danach braucht ein ISO-Datum ein Vorzeichen,
 * und am Rand des Datumsbereichs gibt es kein Ende mehr. Die App legt solche Daten nicht an, ein
 * kaputter Speicher kann sie enthalten.
 */
const FIRST_PURCHASE = Date.UTC(100, 0, 1);
const AFTER_LAST_PURCHASE = Date.UTC(10000, 0, 1);

/**
 * Ende der Gewährleistung auf den Kauf: der letzte Augenblick des Tages in Berlin, der nach seiner
 * Zahl dem Kauftag entspricht, months Monate später (§§ 187 Abs. 1, 188 Abs. 2 und 3 BGB). Der
 * Kauftag ist der Tag in Berlin, gleich mit welcher Zeitzone das Datum gespeichert ist. Kauf am
 * 14.06.2025 ergibt das Ende des 14.06.2027, Kauf am 31.01. plus 1 Monat das Ende des 28.02.
 * Ohne lesbares Datum undefined, ebenso außerhalb der Jahre 100 bis 9999 und ohne darstellbares
 * Ende. Das Gerät gilt dann wie ohne Kaufdatum: Der Händler prüft.
 */
export function purchaseWarrantyUntil(
  purchase: ISODateTime,
  months: number,
): ISODateTime | undefined {
  const bought = time(purchase);
  if (bought === undefined || bought < FIRST_PURCHASE || bought >= AFTER_LAST_PURCHASE) {
    return undefined;
  }
  const last = addCalendarMonths(berlinDay(bought), months);
  const next = new Date(Date.UTC(last.y, last.m - 1, last.d + 1));
  if (Number.isNaN(next.getTime())) return undefined;
  const end = startOfBerlinDay({
    y: next.getUTCFullYear(),
    m: next.getUTCMonth() + 1,
    d: next.getUTCDate(),
  });
  return new Date(end - 1).toISOString();
}

/**
 * Läuft die Gewährleistung auf den Kauf am Stichtag noch? Bis einschließlich purchaseWarrantyUntil,
 * also nach Kalendertagen in Berlin, nicht nach Uhrzeit und nicht in Monaten zu 30,44 Tagen.
 * Ohne lesbares Datum: nein.
 */
export function withinPurchaseWarranty(
  purchase: ISODateTime,
  asOf: ISODateTime,
  months: number,
): boolean {
  const at = time(asOf);
  const until = purchaseWarrantyUntil(purchase, months);
  if (at === undefined || until === undefined) return false;
  return at <= Date.parse(until);
}

function asRegulator(ref: PartnerRef, kind: RegulatorKind): RegulatorRef | undefined {
  return ref.kind === kind ? { id: ref.id, kind, name: ref.name } : undefined;
}

/**
 * Wer die Kosten übernehmen kann, geordnet wie U10 in docs/ANNAHMEN.md. Die Regeln stehen dort
 * unter „Regulierer (Schritt 4)“. Selbstzahlen steht immer am Ende.
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
  let kulanz: RegulatorOption | undefined;
  let warrantySure = false;
  if (dealer) {
    const base = { kind: 'haendler', party: dealer, arranges: true, needsQuote: false } as const;
    const until =
      device.purchaseDate === undefined
        ? undefined
        : purchaseWarrantyUntil(device.purchaseDate, months);
    if (until === undefined || at === undefined) {
      options.push({ ...base, basis: 'gewaehrleistung', certainty: 'pruefen' });
    } else if (at <= Date.parse(until)) {
      warrantySure = true;
      options.push({ ...base, basis: 'gewaehrleistung', certainty: 'sicher', until });
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
