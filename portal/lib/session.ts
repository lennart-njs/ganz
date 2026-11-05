// Sitzung im Portal: Token vom Backend in einem httpOnly-Cookie. Nur auf dem Server lesbar.
// SameSite=Lax: Fremde Seiten können kein Formular mit dem Cookie absenden (Server Actions,
// /abmelden), ein Link aus einer E-Mail ins Portal geht trotzdem. Strict würde den brechen.
import { cookies, headers } from 'next/headers';

import { secureCookie } from './cookie';

export const SESSION_COOKIE = 'machs_portal';

export async function sessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

export async function setSession(token: string) {
  const h = await headers();
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: secureCookie({
      proto: h.get('x-forwarded-proto'),
      host: h.get('host'),
      nodeEnv: process.env.NODE_ENV,
      override: process.env.PORTAL_HTTPS,
    }),
    path: '/',
    maxAge: 8 * 3600,
  });
}

export async function clearSession() {
  (await cookies()).delete(SESSION_COOKIE);
}
