// Wer den Fall übernimmt: der Kundendienst des Händlers (ohne Versicherung, Entscheidung 16)
// oder die Fachkraft und Betriebe aus der Konfiguration.
import { demoConfig, type PartnerConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';
import type { Device, Id } from '@/model/types';
import type { AppData } from '@/store/appStore';

export interface CaseService {
  /** Betriebe zur Auswahl, der erste ist vorgewählt */
  partners: PartnerConfig[];
  /** Fachkraft im Videocall und ihr Betrieb */
  expert: { name: string; partner: PartnerConfig };
}

/** Kundendienst des Händlers, wenn das Gerät ohne Versicherung bei ihm gekauft wurde */
export function dealerService(device?: Pick<Device, 'soldBy' | 'contractId'>) {
  if (!device || device.contractId || !device.soldBy) return undefined;
  const dealer = demoConfig.dealers.find((d) => d.id === device.soldBy!.id);
  return dealer && 'service' in dealer && dealer.service
    ? { dealer, ...dealer.service }
    : undefined;
}

export function serviceFor(device?: Pick<Device, 'soldBy' | 'contractId'>): CaseService {
  const ds = dealerService(device);
  if (ds) {
    const partner: PartnerConfig = {
      id: `${ds.dealer.id}-kundendienst`,
      name: ds.name,
      authorized: false,
      distanceKm: ds.distanceKm,
      dealerService: true,
    };
    return { partners: [partner], expert: { name: ds.expert, partner } };
  }
  const partners = [...demoConfig.partners];
  const partner = partners.find((p) => p.id === demoConfig.expert.partnerId) ?? partners[0]!;
  return { partners, expert: { name: demoConfig.expert.name, partner } };
}

export function caseService(s: Pick<AppData, 'cases' | 'devices'>, caseId: Id): CaseService {
  const c = s.cases[caseId];
  return serviceFor(s.devices.find((d) => d.id === c?.deviceId));
}

/** „Miele-autorisiert“, „Freie Werkstatt“ oder „Kundendienst deines Händlers“ */
export function partnerKind(p: PartnerConfig, manufacturer: string): string {
  if (p.dealerService) return de.partner.dealerService;
  return p.authorized ? de.partner.authorized(manufacturer) : de.partner.independent;
}

/** Kurzname des Versicherers aus dem Vertrag des Geräts, sonst der aus der Konfiguration */
export function insurerShortName(s: Pick<AppData, 'cases' | 'devices' | 'contracts'>, caseId: Id) {
  const c = s.cases[caseId];
  const device = s.devices.find((d) => d.id === c?.deviceId);
  const contract = s.contracts.find((k) => k.id === device?.contractId);
  // Der Versicherer aus `insurer` ist die Whitelabel-Quelle, die Liste ergänzt ihn nur
  if (!contract || contract.provider.id === demoConfig.insurer.id)
    return demoConfig.insurer.shortName;
  return (
    demoConfig.insurers.find((i) => i.id === contract.provider.id)?.shortName ??
    contract.provider.name
  );
}

/** Voller Name des Versicherers aus dem Vertrag des Geräts */
export function insurerName(s: Pick<AppData, 'cases' | 'devices' | 'contracts'>, caseId: Id) {
  const c = s.cases[caseId];
  const device = s.devices.find((d) => d.id === c?.deviceId);
  return (
    s.contracts.find((k) => k.id === device?.contractId)?.provider.name ?? demoConfig.insurer.name
  );
}
