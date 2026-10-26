// Schnittstellen zum späteren Backend. Die App spricht nur mit diesen Interfaces.
import type { Contract, DeviceCategory } from '@/model/types';

export type LinkVia = Contract['linkedVia'];

export type LinkResult =
  { ok: true; via: LinkVia; contractNumber: string } | { ok: false; reason: 'unbekannt' };

export interface ContractService {
  /** Prüft Vertragsnummer oder Händler-Code */
  link(via: LinkVia, value: string): Promise<LinkResult>;
}

export interface TypePlateData {
  manufacturerId: string;
  category: DeviceCategory;
  model: string;
  materialNumber?: string;
  serialNumber?: string;
}

export type TypePlateResult =
  { ok: true; data: TypePlateData } | { ok: false; reason: 'nicht_erkannt' };

export interface TypePlateService {
  read(scenario: 'erkannt' | 'nicht_erkannt'): Promise<TypePlateResult>;
}
