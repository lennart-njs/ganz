// Händlerportal: interne Notiz, Zuweisung oder Bearbeitungsstand. Nur im Portal sichtbar,
// nichts davon kommt beim Haushalt an.
import { parseWorkflowAction } from '@/model/sharing';
import { getCaseStore } from '@/server/backend';
import { tenantFrom } from '@/server/backend/auth';
import { bodyLimits, readJson } from '@/server/http/readJson';

export async function POST(request: Request, { id }: { id: string }): Promise<Response> {
  const tenant = tenantFrom(request);
  if (!tenant) return Response.json({ error: 'anmeldung' }, { status: 401 });
  const read = await readJson(request, bodyLimits.portal);
  if (!read.ok) return Response.json({ error: read.error }, { status: read.status });
  const action = parseWorkflowAction(read.body);
  if (!action) return Response.json({ error: 'ungueltig' }, { status: 400 });
  const ok = await getCaseStore().applyWorkflow(tenant, id, action);
  if (!ok) return Response.json({ error: 'nicht_gefunden' }, { status: 404 });
  return Response.json({ ok: true });
}
