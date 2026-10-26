import { demoConfig } from '@/config/demo.config';
import type { TypePlateService } from '@/services/types';

import { delay } from './timing';

/** Liest im Mock immer das Gerät aus der Konfiguration, außer im Szenario „nicht erkannt“. */
export const mockTypePlateService: TypePlateService = {
  async read(scenario) {
    await delay(1200);
    if (scenario === 'nicht_erkannt') return { ok: false, reason: 'nicht_erkannt' };
    return {
      ok: true,
      data: {
        manufacturerId: demoConfig.manufacturer.id,
        category: demoConfig.device.category,
        model: demoConfig.device.model,
        materialNumber: demoConfig.device.typePlate.materialNumber,
        serialNumber: demoConfig.device.typePlate.serialNumber,
      },
    };
  },
};
