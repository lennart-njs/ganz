import { useEffect } from 'react';

import { isClosed } from '@/model/caseMachine';

import { nextSimulationDue, useAppStore } from './appStore';

/**
 * Mock-Timer für Freigabe und Betrieb. Prüft jede Sekunde, ob ein Schritt fällig ist.
 * Fällige Schritte aus der Zeit vor einem Neustart laufen sofort.
 */
export function useCaseSimulation() {
  useEffect(() => {
    const tick = () => {
      const s = useAppStore.getState();
      const now = Date.now();
      for (const c of Object.values(s.cases)) {
        if (isClosed(c.status)) continue;
        const due = nextSimulationDue(s, c.id);
        if (due !== undefined && now >= due) s.simulateNext(c.id);
      }
    };
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);
}
