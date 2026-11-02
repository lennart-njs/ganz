// Händlerportal: Fälle dieses Händlers. Nur, was Haushalte ausdrücklich an ihn gesendet haben.
import { getCaseStore } from '@/server/backend';
import { tenantFrom } from '@/server/backend/auth';

export async function GET(request: Request): Promise<Response> {
  const tenant = tenantFrom(request);
  if (!tenant) return Response.json({ error: 'anmeldung' }, { status: 401 });
  const cases = await getCaseStore().listForTenant(tenant);
  return Response.json({ tenant, cases }, { headers: { 'Cache-Control': 'no-store' } });
}
