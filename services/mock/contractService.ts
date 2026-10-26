import { demoConfig } from '@/config/demo.config';
import type { ContractService } from '@/services/types';

import { delay } from './timing';

const normalize = (v: string) => v.replace(/[\s-]/g, '').toUpperCase();

/** Kennt genau die Vertragsnummer und den Händler-Code aus der Konfiguration. */
export const mockContractService: ContractService = {
  async link(via, value) {
    await delay(800);
    const expected = via === 'vertragsnummer' ? demoConfig.contract.number : demoConfig.dealer.code;
    if (normalize(value) !== normalize(expected)) return { ok: false, reason: 'unbekannt' };
    return { ok: true, via, contractNumber: demoConfig.contract.number };
  },
};
