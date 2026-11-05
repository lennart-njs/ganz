// Händlerportal: Anmeldung (Demo-Konto aus der Konfiguration). Fehlversuche begrenzt ein
// Rate-Limit je IP-Adresse und je E-Mail (server/http/rateLimits.ts): danach 429, auch mit dem
// richtigen Passwort, bis das Fenster weiterrückt.
import { clientIp } from '@/lib/chat/guard';
import { login } from '@/server/backend/auth';
import { bodyLimits, readJson } from '@/server/http/readJson';
import { loginFailures, loginRate } from '@/server/http/rateLimits';

export async function POST(request: Request): Promise<Response> {
  const read = await readJson(request, bodyLimits.portal);
  if (!read.ok && read.error === 'zu_gross') {
    return Response.json({ error: read.error }, { status: read.status });
  }
  // Kein JSON: leer lassen, ergibt 401
  const body = ((read.ok ? read.body : null) ?? {}) as { email?: unknown; password?: unknown };
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase().slice(0, 254) : '';
  const keys = [`ip:${clientIp(request)}`, ...(email ? [`email:${email}`] : [])];
  const gate = loginFailures.check(keys, loginRate);
  if (!gate.ok) {
    return Response.json(
      { error: 'zu_viele' },
      { status: 429, headers: { 'Retry-After': String(gate.retryAfterS) } },
    );
  }
  const session = login(body.email, body.password);
  if (!session) {
    loginFailures.record(keys, loginRate);
    return Response.json({ error: 'anmeldung' }, { status: 401 });
  }
  return Response.json(session, { headers: { 'Cache-Control': 'no-store' } });
}
