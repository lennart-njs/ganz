// Händlerportal: Anmeldung (Demo-Konto aus der Konfiguration)
import { login } from '@/server/backend/auth';
import { bodyLimits, readJson } from '@/server/http/readJson';

export async function POST(request: Request): Promise<Response> {
  const read = await readJson(request, bodyLimits.portal);
  if (!read.ok && read.error === 'zu_gross') {
    return Response.json({ error: read.error }, { status: read.status });
  }
  // Kein JSON: leer lassen, ergibt 401
  const body = ((read.ok ? read.body : null) ?? {}) as { email?: unknown; password?: unknown };
  const session = login(body.email, body.password);
  if (!session) return Response.json({ error: 'anmeldung' }, { status: 401 });
  return Response.json(session, { headers: { 'Cache-Control': 'no-store' } });
}
