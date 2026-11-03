// Händlerportal: anonyme Zahlen für die Auswertung. Keine Namen, keine Adressen, keine Fallnummern.
import { getCaseStore } from '@/server/backend';
import { tenantFrom } from '@/server/backend/auth';

export async function GET(request: Request): Promise<Response> {
  const tenant = tenantFrom(request);
  if (!tenant) return Response.json({ error: 'anmeldung' }, { status: 401 });
  const anonymous = await getCaseStore().anonymousOutcomes(tenant);
  return Response.json({ anonymous }, { headers: { 'Cache-Control': 'no-store' } });
}
