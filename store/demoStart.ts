// Demo-Startstände für den Pitch (ZUKUNFTSPLAN Phase 0, Pitch-Rhythmus). Feste IDs und eine feste
// Zeit, damit jedes Laden denselben Stand ergibt. Kein Fall. Eine Einwilligung: In den
// Reparatur-Assistenten hat der Haushalt im Profil eingewilligt (Entscheidung 38), so steht im
// Gespräch kein Hinweis.
// - 'haendler' („Demo-Startstand laden“): der Stand nach dem Onboarding der Demo mit Fründ
//   (Entscheidung 31): Gerät aus dem Katalog, gekauft beim Händler, „Nein, keine Versicherung“.
//   Dazu das Kaufdatum als Beispielwert, nach dem das Onboarding nicht fragt.
// - 'versicherung' („Demo-Startstand Versicherung“): der Stand nach dem Onboarding der ganz-Linie.
//   Schutz über die Vertragsnummer verknüpft, das Gerät aus dem Vertrag, ohne Händler.
// Das Onboarding baut Gerät, Händler und Vertrag mit denselben Funktionen.
import { demoConfig } from '@/config/demo.config';
import { catalog, type CatalogModel } from '@/data/catalog';
import { textStamp } from '@/lib/legalTexts';
import { scopedConsent } from '@/model/policies/consentScopes';
import type {
  Cents,
  Consent,
  Contract,
  Device,
  Household,
  Id,
  ISODateTime,
  PartnerRef,
  Person,
} from '@/model/types';

import type { AppData, NewDevice } from './appStore';

export type DemoStartKind = 'haendler' | 'versicherung';

/** Feste IDs im Startstand. Neue IDs aus env.newId tragen immer eine Zeit, sie kollidieren nicht. */
export const DEMO_START_IDS = {
  person: 'person-demo',
  household: 'haushalt-demo',
  contract: 'vertrag-demo',
  device: 'geraet-demo',
  assistantConsent: 'einwilligung-assistent-demo',
} as const;

/** Der Vertrag aus der Konfiguration, so wie „Schutz verknüpfen“ ihn anlegt. */
export function contractFromConfig(input: {
  id: Id;
  householdId: Id;
  policyholderId: Id;
  deductible: Cents;
  linkedVia: Contract['linkedVia'];
  linkedAt: ISODateTime;
  coveredDeviceIds: Id[];
}): Contract {
  const cfg = demoConfig;
  return {
    id: input.id,
    householdId: input.householdId,
    kind: cfg.contract.kind,
    provider: { id: cfg.insurer.id, kind: 'versicherer', name: cfg.insurer.name },
    soldBy: { id: cfg.dealer.id, kind: 'haendler', name: cfg.dealer.name },
    productName: cfg.contract.productName,
    contractNumber: cfg.contract.number,
    policyholderId: input.policyholderId,
    validFrom: cfg.contract.validFrom,
    validUntil: cfg.contract.validUntil,
    deductible: input.deductible,
    coveredDeviceIds: input.coveredDeviceIds,
    linkedVia: input.linkedVia,
    linkedAt: input.linkedAt,
  };
}

/** Das Gerät aus dem Vertrag, so wie „Ja, das ist es“ im Onboarding es anlegt. */
export function contractDevice(contractId: Id | undefined): NewDevice {
  const cfg = demoConfig;
  return {
    manufacturerId: cfg.manufacturer.id,
    category: cfg.device.category,
    model: cfg.device.model,
    purchaseDate: cfg.device.purchaseDate,
    contractId,
    identifiedBy: 'vertrag',
  };
}

/** Ein Gerät aus dem Katalog, so wie „Gerät suchen“ es anlegt (components/app/DeviceSetup.tsx). */
export function catalogDevice(model: CatalogModel): NewDevice {
  return {
    manufacturerId: model.manufacturerId,
    category: model.category,
    model: model.model,
    identifiedBy: 'katalog',
  };
}

/** Der Händler aus der Liste, so wie „Wo hast du es gekauft?“ ihn ans Gerät schreibt. */
export function dealerRef(dealerId: string | undefined): PartnerRef | undefined {
  const dealer = demoConfig.dealers.find((d) => d.id === dealerId);
  return dealer ? { id: dealer.id, kind: 'haendler', name: dealer.name } : undefined;
}

/** Gerät der Demo mit dem Händler: Katalog-Eintrag aus `dealerDemo`, erster Händler der Liste */
function dealerDemoDevice(): NewDevice {
  const cfg = demoConfig;
  const model = catalog.find((m) => m.id === cfg.dealerDemo.catalogId);
  if (!model) throw new Error(`Katalog-Eintrag fehlt: ${cfg.dealerDemo.catalogId}`);
  return {
    ...catalogDevice(model),
    purchaseDate: cfg.dealerDemo.purchaseDate,
    soldBy: dealerRef(cfg.dealers[0]!.id),
  };
}

/**
 * Der Startstand auf Basis des Anfangsstands: Demo-Einstellungen, Mitteilungen und Fallnummer
 * wie nach „Alles zurücksetzen“, dazu Haushalt und Gerät, beim Startstand mit Versicherung auch
 * der Vertrag. Die Darstellung setzt der Aufrufer, sie ist eine Einstellung des Telefons.
 */
export function demoStartData(initial: AppData, kind: DemoStartKind = 'haendler'): AppData {
  const cfg = demoConfig;
  const at = cfg.demo.startAt;
  const ids = DEMO_START_IDS;
  const person: Person = {
    id: ids.person,
    displayName: cfg.household.displayName,
    role: 'versicherungsnehmer',
  };
  const household: Household = {
    id: ids.household,
    members: [person],
    address: { ...cfg.household.address },
    createdAt: at,
  };
  // Wie „Reparatur-Assistent nutzen“ im Profil (grantAssistantConsent), mit fester ID und Zeit
  const assistantConsent: Consent = {
    ...scopedConsent('chat_assistent', {
      recipient: {
        id: cfg.assistant.id,
        kind: 'dienstleister',
        name: cfg.assistant.name,
      },
      text: textStamp('assistent_einwilligung'),
    }),
    id: ids.assistantConsent,
    personId: person.id,
    grantedAt: at,
  };
  const base = {
    ...initial,
    onboardingDone: true,
    household,
    persons: [person],
    consents: [assistantConsent],
  };
  const device = (input: NewDevice): Device => ({
    ...input,
    id: ids.device,
    householdId: household.id,
    createdAt: at,
  });

  if (kind === 'haendler') {
    return { ...base, contracts: [], devices: [device(dealerDemoDevice())] };
  }
  const contract = contractFromConfig({
    id: ids.contract,
    householdId: household.id,
    policyholderId: person.id,
    deductible: initial.demo.deductible,
    linkedVia: 'vertragsnummer',
    linkedAt: at,
    coveredDeviceIds: [ids.device],
  });
  return { ...base, contracts: [contract], devices: [device(contractDevice(contract.id))] };
}
