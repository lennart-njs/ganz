// Sitzung im Portal: Token vom Backend in einem httpOnly-Cookie. Nur auf dem Server lesbar.
import { cookies } from 'next/headers';

export const SESSION_COOKIE = 'machs_portal';

export async function sessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

export async function setSession(token: string) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 8 * 3600,
  });
}

export async function clearSession() {
  (await cookies()).delete(SESSION_COOKIE);
}
