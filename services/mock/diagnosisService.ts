// Intelligente Fehlererkennung als Regel-Mock: Modus + Demo-Szenario → Ergebnis.
// BUILD_PLAN Abschnitt 5.1.
import type { DiagnosisService } from '@/services/types';

import { delay } from './timing';

export const mockDiagnosisService: DiagnosisService = {
  async analyze({ mode, scenario, category = 'waschmaschine' }) {
    await delay(400);
    if (scenario === 'unscharf') return { kind: 'fehler', reason: 'unscharf' };
    if (mode === 'typenschild') return { kind: 'geraet' };
    if (category !== 'waschmaschine') return { kind: 'ohne_anleitung' };
    if (scenario === 'unsicher') return { kind: 'rueckfrage', question: 'wasser' };
    if (mode === 'display') {
      return {
        kind: 'ergebnis',
        errorPattern: 'wasserablauf',
        displayMessage: 'Wasserablauf',
        confidence: 'hoch',
        confidenceScore: 0.92,
        guideId: 'ablauf',
      };
    }
    return {
      kind: 'ergebnis',
      errorPattern: 'laugenpumpe_blockiert',
      confidence: 'mittel',
      confidenceScore: 0.71,
      guideId: 'ablauf',
    };
  },

  answer(answer) {
    if (answer === 'unklar') return null;
    return answer === 'ablauf'
      ? {
          kind: 'ergebnis',
          errorPattern: 'wasserablauf',
          confidence: 'mittel',
          confidenceScore: 0.64,
          guideId: 'ablauf',
        }
      : {
          kind: 'ergebnis',
          errorPattern: 'wasserzulauf',
          confidence: 'mittel',
          confidenceScore: 0.61,
          guideId: 'zulauf',
        };
  },
};
