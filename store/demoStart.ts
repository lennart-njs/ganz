// Demo-Startstand für den Pitch (ZUKUNFTSPLAN Phase 0, Pitch-Rhythmus): der Stand nach dem
// Onboarding im Golden Path. Schutz über die Vertragsnummer verknüpft, das Gerät aus dem Vertrag,
// kein Fall. Feste IDs und eine feste Zeit, damit jedes Laden denselben Stand ergibt.
// linkContract und „Ja, das ist es“ im Onboarding bauen Vertrag und Gerät mit denselben Funktionen.
import { demoConfig } from '@/config/demo.config';
import type { Cents, Contract, Device, Household, Id, ISODateTime, Person } from '@/model/types';

import type { AppData, NewDevice } from './appStore';

/** Feste IDs im Startstand. Neue IDs aus env.newId tragen immer eine Zeit, sie kollidieren nicht. */
export const DEMO_START_IDS = {
  person: 'person-demo',
  household: 'haushalt-demo',
  contract: 'vertrag-demo',
  device: 'geraet-demo',
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

/**
 * Der Startstand auf Basis des Anfangsstands: Demo-Einstellungen, Mitteilungen und Fallnummer
 * wie nach „Alles zurücksetzen“, dazu Haushalt, Vertrag und Gerät. Die Darstellung setzt der
 * Aufrufer, sie ist eine Einstellung des Telefons.
 */
export function demoStartData(initial: AppData): AppData {
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
  const contract = contractFromConfig({
    id: ids.contract,
    householdId: household.id,
    policyholderId: person.id,
    deductible: initial.demo.deductible,
    linkedVia: 'vertragsnummer',
    linkedAt: at,
    coveredDeviceIds: [ids.device],
  });
  const device: Device = {
    ...contractDevice(contract.id),
    id: ids.device,
    householdId: household.id,
    createdAt: at,
  };
  return {
    ...initial,
    onboardingDone: true,
    household,
    persons: [person],
    contracts: [contract],
    devices: [device],
  };
}
