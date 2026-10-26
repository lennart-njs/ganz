import { demoConfig } from '@/config/demo.config';
import type { Device, Manufacturer } from '@/model/types';

/** Hersteller aus der Konfiguration. Der Prototyp kennt einen Hersteller. */
export function getManufacturer(id: string): Manufacturer {
  const m = demoConfig.manufacturer;
  return {
    id,
    name: id === m.id ? m.name : id,
    serviceContact: id === m.id ? m.serviceContact : undefined,
  };
}

export function deviceTitle(device: Pick<Device, 'manufacturerId' | 'model'>): string {
  return `${getManufacturer(device.manufacturerId).name} ${device.model}`;
}
