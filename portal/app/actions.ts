'use server';

import { revalidatePath } from 'next/cache';

import type { WorkflowStatus } from '@/model/portal';
import type { BulkAction } from '@/server/backend/types';

import { sendBulk, sendWorkflow } from '../lib/api';

/** Arbeitsliste: dieselbe Aktion für mehrere Fälle */
export async function bulkAction(ids: string[], action: BulkAction): Promise<number> {
  const n = await sendBulk(ids, action);
  revalidatePath('/');
  return n;
}

/** Tafel: Fall in eine andere Spalte ziehen */
export async function moveCase(id: string, status: WorkflowStatus): Promise<boolean> {
  const ok = await sendWorkflow(id, { type: 'stand', status });
  revalidatePath('/');
  return ok;
}
