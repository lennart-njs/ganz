import { de } from '@/i18n/de';
import { findModel, type CatalogMessage, type CatalogProblem } from '@/data/catalog';
import { GUIDE_SOURCE } from '@/data/guides';
import type { Device, DeviceCategory, Id } from '@/model/types';
import type { AppData } from '@/store/appStore';

export type ApplianceTexts = (typeof de.appliance)[DeviceCategory];

/** Texte je Gerätetyp. Ohne Gerät gelten die der Waschmaschine (Demo-Gerät). */
export function appliance(category?: DeviceCategory): ApplianceTexts {
  return de.appliance[category ?? 'waschmaschine'];
}

type DeviceLike = Pick<Device, 'manufacturerId' | 'model' | 'category'>;

export interface DeviceGuides {
  /** Einstiege in „Problem melden“, jeweils mit Anleitung */
  problems: CatalogProblem[];
  /** Meldungen im Display */
  messages: CatalogMessage[];
  /** Pflege-Anleitungen (nur die Demo-Waschmaschine) */
  care: boolean;
  /** Gebrauchsanweisung, aus der die Anleitungen stammen */
  source: string;
  /** Fehlerbild der Intelligenten Fehlererkennung → Anleitung */
  patterns: { ablauf: string; zulauf: string };
}

const demoSet: DeviceGuides = {
  problems: de.problems.filter((p) => p.id !== 'meldung').map((p) => ({ ...p, guideId: p.id })),
  messages: [...de.displayMessages],
  care: true,
  source: GUIDE_SOURCE,
  patterns: { ablauf: 'ablauf', zulauf: 'zulauf' },
};

/**
 * Anleitungen zum Gerät. Modelle aus dem Katalog bekommen die Anleitungen aus ihrer
 * Gebrauchsanweisung. Jede andere Waschmaschine bekommt die der Demo (WKB 130).
 * Für andere Geräte erfinden wir keine Anleitung.
 */
export function deviceGuides(device?: DeviceLike): DeviceGuides | undefined {
  const model = findModel(device);
  if (model?.problems) {
    return {
      problems: model.problems,
      messages: model.messages ?? [],
      care: false,
      source: model.manual,
      patterns: model.patterns,
    };
  }
  return (device?.category ?? 'waschmaschine') === 'waschmaschine' ? demoSet : undefined;
}

/** Gibt es Anleitungen? Mit Gerät nach Modell, mit Gerätetyp nach der Demo (nur Waschmaschine). */
export function hasGuides(device?: DeviceLike | DeviceCategory): boolean {
  if (typeof device === 'string' || device === undefined) {
    return (device ?? 'waschmaschine') === 'waschmaschine';
  }
  return !!deviceGuides(device);
}

/** Anleitung der Fehlererkennung zum Gerät: aus „ablauf“ wird z. B. „g5833_ablauf“ */
export function guideForDevice(device: DeviceLike | undefined, guideId: string): string {
  const set = deviceGuides(device);
  if (!set) return guideId;
  if (guideId === 'ablauf') return set.patterns.ablauf;
  if (guideId === 'zulauf') return set.patterns.zulauf;
  return guideId;
}

/** Gerät eines Falls */
export function caseDevice(s: Pick<AppData, 'cases' | 'devices'>, caseId: Id) {
  const c = s.cases[caseId];
  return s.devices.find((d) => d.id === c?.deviceId);
}

/** Gerätetyp eines Falls */
export function caseCategory(s: Pick<AppData, 'cases' | 'devices'>, caseId: Id) {
  const c = s.cases[caseId];
  return s.devices.find((d) => d.id === c?.deviceId)?.category;
}

/** Texte zum Gerät eines Falls */
export function caseAppliance(s: Pick<AppData, 'cases' | 'devices'>, caseId: Id): ApplianceTexts {
  return appliance(caseCategory(s, caseId));
}

/** Fehlerbild des Beispielbefunds je Gerätetyp, für Fallakte und Dashboards */
export function findingPattern(category?: DeviceCategory): string {
  return category && category !== 'waschmaschine'
    ? `${category}_teil_defekt`
    : 'laugenpumpe_defekt';
}
