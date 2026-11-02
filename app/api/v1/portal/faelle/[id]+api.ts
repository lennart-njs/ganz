// Händlerportal: eine Fallakte
import { getCaseStore } from '@/server/backend';
import { tenantFrom } from '@/server/backend/auth';

export async function GET(request: Request, { id }: { id: string }): Promise<Response> {
  const tenant = tenantFrom(request);
  if (!tenant) return Response.json({ error: 'anmeldung' }, { status: 401 });
  const record = await getCaseStore().getForTenant(tenant, id);
  if (!record) return Response.json({ error: 'nicht_gefunden' }, { status: 404 });
  return Response.json({ tenant, record }, { headers: { 'Cache-Control': 'no-store' } });
}
