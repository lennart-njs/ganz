import { manufacturers } from '@/data/catalog';
import { demoConfig } from '@/config/demo.config';
import type { Device, Manufacturer } from '@/model/types';

/** Hersteller aus Konfiguration und Gerätekatalog. Den Kundendienst kennt nur die Konfiguration. */
export function getManufacturer(id: string): Manufacturer {
  const m = demoConfig.manufacturer;
  return {
    id,
    name: id === m.id ? m.name : (manufacturers[id] ?? id),
    serviceContact: id === m.id ? m.serviceContact : undefined,
  };
}

export function deviceTitle(device: Pick<Device, 'manufacturerId' | 'model'>): string {
  return `${getManufacturer(device.manufacturerId).name} ${device.model}`;
}
