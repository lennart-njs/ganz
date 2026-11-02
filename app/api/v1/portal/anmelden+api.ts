// Händlerportal: Anmeldung (Demo-Konto aus der Konfiguration)
import { login } from '@/server/backend/auth';

export async function POST(request: Request): Promise<Response> {
  let body: { email?: unknown; password?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    // leer lassen, ergibt 401
  }
  const session = login(body.email, body.password);
  if (!session) return Response.json({ error: 'anmeldung' }, { status: 401 });
  return Response.json(session, { headers: { 'Cache-Control': 'no-store' } });
}
