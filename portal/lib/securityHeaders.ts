// Sicherheits-Header für jede Seite des Portals (next.config.ts). Ohne Next-Abhängigkeiten, damit
// Jest sie prüfen kann (__tests__/security.test.ts).
//
// Inline-Skripte erlaubt die Richtlinie, weil Next.js seine Daten für die Seite als Inline-Skript
// schreibt. Ohne Nonce ginge sonst nichts. Ein Nonce braucht Middleware und macht jede Seite
// dynamisch: der nächste Schritt, nicht vor der Demo. Inline-Styles braucht das Layout (Farben aus
// theme/ als <style>) und style-Attribute. Bilder als data: sind die Fotos aus der Fallakte.
// Keine fremden Quellen: Schrift, Logo und Icons liegen unter public/.

export function contentSecurityPolicy(dev: boolean): string {
  return [
    "default-src 'self'",
    // next dev braucht eval für Fehlermeldungen und Fast Refresh
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    // next dev lädt Änderungen über einen WebSocket
    `connect-src 'self'${dev ? ' ws: wss:' : ''}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

export function securityHeaders(dev: boolean): { key: string; value: string }[] {
  return [
    { key: 'Content-Security-Policy', value: contentSecurityPolicy(dev) },
    // Für Browser ohne frame-ancestors
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    // Nicht no-referrer: Dann schickt der Browser beim Absenden eines Formulars „Origin: null“,
    // und Next.js lehnt Server Actions ab, die ohne JavaScript ankommen
    { key: 'Referrer-Policy', value: 'same-origin' },
    // Der Videocall ist in der Demo ohne Verbindung (Entscheidung 35) und braucht weder Kamera
    // noch Mikrofon. Mit WebRTC: camera=(self), microphone=(self).
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), display-capture=()',
    },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  ];
}
