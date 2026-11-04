// Händlerportal: Aktion zum Fall (annehmen, Rückfrage, Entscheidung, Betrieb, Status).
// Jede Aktion wird ein CaseEvent, das die App beim nächsten Abruf ins Gespräch holt.
import { parseRetailerAction } from '@/model/sharing';
import { getCaseStore } from '@/server/backend';
import { tenantFrom } from '@/server/backend/auth';
import { bodyLimits, readJson } from '@/server/http/readJson';

export async function POST(request: Request, { id }: { id: string }): Promise<Response> {
  const tenant = tenantFrom(request);
  if (!tenant) return Response.json({ error: 'anmeldung' }, { status: 401 });
  const read = await readJson(request, bodyLimits.portal);
  if (!read.ok) return Response.json({ error: read.error }, { status: read.status });
  const action = parseRetailerAction(read.body);
  if (!action) return Response.json({ error: 'ungueltig' }, { status: 400 });
  const event = await getCaseStore().addRetailerAction(tenant, id, action);
  if (!event) return Response.json({ error: 'nicht_gefunden' }, { status: 404 });
  return Response.json({ event });
}
