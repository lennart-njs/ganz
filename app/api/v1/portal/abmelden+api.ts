// Händlerportal: Abmelden. Sperrt das Token, danach lehnt jede Route unter /api/v1/portal/ es ab.
import { logout } from '@/server/backend/auth';

export async function POST(request: Request): Promise<Response> {
  if (!logout(request)) return Response.json({ error: 'anmeldung' }, { status: 401 });
  return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}
