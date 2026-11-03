// Händlerportal: interne Notiz, Zuweisung oder Bearbeitungsstand. Nur im Portal sichtbar,
// nichts davon kommt beim Haushalt an.
import { parseWorkflowAction } from '@/model/sharing';
import { getCaseStore } from '@/server/backend';
import { tenantFrom } from '@/server/backend/auth';

export async function POST(request: Request, { id }: { id: string }): Promise<Response> {
  const tenant = tenantFrom(request);
  if (!tenant) return Response.json({ error: 'anmeldung' }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'ungueltig' }, { status: 400 });
  }
  const action = parseWorkflowAction(body);
  if (!action) return Response.json({ error: 'ungueltig' }, { status: 400 });
  const ok = await getCaseStore().applyWorkflow(tenant, id, action);
  if (!ok) return Response.json({ error: 'nicht_gefunden' }, { status: 404 });
  return Response.json({ ok: true });
}
