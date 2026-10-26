import type { VideoService } from '@/services/types';

import { delay } from './timing';

/** Wartezeit 3 bis 8 Sekunden, dann verbunden. Szenario „keine Fachkraft“: Rückruf-Angebot. */
export const mockVideoService: VideoService = {
  async connect(scenario) {
    const seconds = 3 + Math.round(Math.random() * 5);
    await delay(seconds * 1000);
    return scenario === 'keine_fachkraft' ? 'keine_fachkraft' : 'verbunden';
  },
  /** Was die Fachkraft im Golden Path feststellt */
  finding() {
    return 'reparatur';
  },
};
