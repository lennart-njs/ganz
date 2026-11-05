import { NextResponse } from 'next/server';

import { logout } from '../../lib/api';
import { SESSION_COOKIE, sessionToken } from '../../lib/session';

/**
 * Abmelden: erst das Token im Backend sperren, dann das Cookie löschen. Ist das Backend nicht
 * erreichbar, ist das Cookie trotzdem weg. Die Weiterleitung ist relativ, damit sie auf derselben
 * Adresse bleibt, egal wie das Portal aufgerufen wurde (localhost, 127.0.0.1, Name im Netz).
 */
export async function POST() {
  const token = await sessionToken();
  if (token) await logout(token);
  const res = new NextResponse(null, { status: 303, headers: { Location: '/anmelden' } });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
