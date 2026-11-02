// Welches Backend läuft. Heute: Dateispeicher. Hier wird später die Datenbank eingesetzt
// (Anbieter entscheidet Lennart, Entscheidung 21).
import path from 'node:path';

import { FileCaseStore } from './fileStore';
import type { CaseStore } from './types';

let store: CaseStore | undefined;

export function getCaseStore(): CaseStore {
  store ??= new FileCaseStore(
    path.join(process.env.GANZ_DATA_DIR ?? path.join(process.cwd(), '.data'), 'ganz-backend.json'),
  );
  return store;
}

/** Nur für Tests */
export function setCaseStore(next: CaseStore | undefined) {
  store = next;
}

export type { CaseStore, Tenant } from './types';
