// Uhr und IDs an einer Stelle, damit Tests sie festlegen können.
import type { Id, ISODateTime } from '@/model/types';

export interface StoreEnv {
  now: () => ISODateTime;
  newId: (prefix: string) => Id;
}

let counter = 0;

export const defaultEnv: StoreEnv = {
  now: () => new Date().toISOString(),
  newId: (prefix) =>
    `${prefix}-${Date.now().toString(36)}-${(counter++).toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 6)}`,
};
