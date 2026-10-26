import { de } from '@/i18n/de';
import type { DeviceCategory, Id } from '@/model/types';
import type { AppData } from '@/store/appStore';

export type ApplianceTexts = (typeof de.appliance)[DeviceCategory];

/** Texte je Gerätetyp. Ohne Gerät gelten die der Waschmaschine (Demo-Gerät). */
export function appliance(category?: DeviceCategory): ApplianceTexts {
  return de.appliance[category ?? 'waschmaschine'];
}

/** Die Anleitungen aus der Demo stammen aus der Gebrauchsanweisung einer Waschmaschine. */
export function hasGuides(category?: DeviceCategory): boolean {
  return (category ?? 'waschmaschine') === 'waschmaschine';
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
