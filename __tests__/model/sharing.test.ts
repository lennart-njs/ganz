// Kleine Helfer für Eingaben aus dem Händlerportal: Sie ersetzen Status-Vergleiche in Screens und
// API-Routen (Übertragung Schritt 3, Lint ganz/kein-status-vergleich ohne Übergangsliste).
import { isWorkflowStatus, workflowStatuses } from '@/model/portal';
import { parseWorkflowAction, partStatusOf } from '@/model/sharing';

describe('partStatusOf: Stand eines Ersatzteils aus haendler_ersatzteil', () => {
  test('geliefert bleibt geliefert, alles andere ist bestellt', () => {
    expect(partStatusOf({ status: 'geliefert' })).toBe('geliefert');
    expect(partStatusOf({ status: 'bestellt' })).toBe('bestellt');
    expect(partStatusOf({})).toBe('bestellt');
    expect(partStatusOf({ status: 'unterwegs' })).toBe('bestellt');
    expect(partStatusOf({ status: 1 })).toBe('bestellt');
  });
});

describe('isWorkflowStatus: Stand der Arbeitsliste im Portal', () => {
  test('genau die Stände der Arbeitsliste', () => {
    for (const status of workflowStatuses) expect(isWorkflowStatus(status)).toBe(true);
    for (const other of ['', 'offen', 'eskaliert', 'NEU', undefined, null, 1, {}, ['neu']]) {
      expect([other, isWorkflowStatus(other)]).toEqual([other, false]);
    }
  });

  test('die Aktion „Stand“ nimmt nur einen Stand der Arbeitsliste', () => {
    expect(parseWorkflowAction({ type: 'stand', status: 'termin' })).toEqual({
      type: 'stand',
      status: 'termin',
    });
    expect(parseWorkflowAction({ type: 'stand', status: 'eskaliert' })).toBeNull();
    expect(parseWorkflowAction({ type: 'stand' })).toBeNull();
  });
});
