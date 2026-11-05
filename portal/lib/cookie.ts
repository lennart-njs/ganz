// Wann das Sitzungs-Cookie Secure ist. Ohne Next-Abhängigkeiten, damit Jest es prüfen kann
// (__tests__/security.test.ts).

/**
 * Ein Name im eigenen Netz: localhost, Loopback, private IPv4-Adressen, Namen ohne Punkt und
 * .local (Rechnername im WLAN). Dort läuft die Demo über http, ein Secure-Cookie käme nie zurück.
 */
export function isLocalHost(host: string | null | undefined): boolean {
  if (!host) return false;
  let name = host.trim().toLowerCase();
  if (name.startsWith('[')) name = name.slice(1, name.indexOf(']'));
  else if (name.split(':').length === 2) name = name.split(':')[0]!;
  if (!name) return false;
  if (name === '::1' || name.startsWith('fe80:') || /^f[cd][0-9a-f]{2}:/.test(name)) return true;
  const ip = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(name);
  if (ip) {
    const a = Number(ip[1]);
    const b = Number(ip[2]);
    return (
      a === 127 ||
      a === 10 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254)
    );
  }
  return !name.includes('.') || name.endsWith('.local') || name.endsWith('.localhost');
}

/**
 * Secure, sobald die Anfrage über HTTPS kam (auch hinter einem Proxy, der x-forwarded-proto
 * setzt) und in Produktion (`next start`) für jede Adresse außerhalb des eigenen Netzes, auch
 * wenn der Proxy x-forwarded-proto vergisst. Auf http://localhost und im WLAN bleibt es aus, sonst
 * ginge die Demo nicht. PORTAL_HTTPS=1 erzwingt Secure, PORTAL_HTTPS=0 schaltet es ab.
 */
export function secureCookie(input: {
  proto: string | null | undefined;
  host: string | null | undefined;
  nodeEnv: string | undefined;
  override?: string | undefined;
}): boolean {
  if (input.override === '1') return true;
  if (input.override === '0') return false;
  if (input.proto?.split(',')[0]?.trim().toLowerCase() === 'https') return true;
  return input.nodeEnv === 'production' && !isLocalHost(input.host);
}
