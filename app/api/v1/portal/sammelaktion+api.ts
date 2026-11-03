// Händlerportal: dieselbe Aktion für mehrere Fälle (annehmen, zuweisen, Stand)
import { workflowStatuses, type WorkflowStatus } from '@/model/portal';
import { getCaseStore } from '@/server/backend';
import { tenantFrom } from '@/server/backend/auth';
import type { BulkAction } from '@/server/backend/types';

function parse(body: unknown): { ids: string[]; action: BulkAction } | null {
  if (!body || typeof body !== 'object') return null;
  const { ids, action } = body as { ids?: unknown; action?: Record<string, unknown> };
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 200) return null;
  if (!ids.every((x) => typeof x === 'string' && x.length <= 40)) return null;
  if (!action || typeof action !== 'object') return null;
  if (action.type === 'annehmen') return { ids, action: { type: 'annehmen' } };
  if (action.type === 'zuweisen') {
    const a = action.assigneeId;
    if (a !== null && (typeof a !== 'string' || a.length > 80)) return null;
    return { ids, action: { type: 'zuweisen', assigneeId: a as string | null } };
  }
  if (action.type === 'stand' && workflowStatuses.includes(action.status as WorkflowStatus))
    return { ids, action: { type: 'stand', status: action.status as WorkflowStatus } };
  return null;
}

export async function POST(request: Request): Promise<Response> {
  const tenant = tenantFrom(request);
  if (!tenant) return Response.json({ error: 'anmeldung' }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'ungueltig' }, { status: 400 });
  }
  const parsed = parse(body);
  if (!parsed) return Response.json({ error: 'ungueltig' }, { status: 400 });
  const count = await getCaseStore().bulk(tenant, parsed.ids, parsed.action);
  return Response.json({ count });
}
