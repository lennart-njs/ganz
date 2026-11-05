// Rate-Limits der Routen für Fälle aus der App und für die Anmeldung im Portal. Dasselbe Rate-Limit
// wie die Chat-Route (lib/chat/guard.ts), im Speicher des Prozesses. Expo bündelt jede Route
// einzeln, darum hat jede Route ihre eigenen Zähler.
//
// Der Dev-Server von Expo (`npx expo start`) wertet das Bündel einer Route bei jeder Anfrage neu
// aus (ssrImportApiRoute in @expo/cli: „TODO: Cache the evaluated function“). Zähler, die nur im
// Modul stehen, fingen dann jedes Mal bei null an. Darum hängen diese an globalThis, einmal je
// Prozess. Gemessen am Dev-Server: ohne das ging der 26. neue Fall in einer Minute noch durch.
//
// Ohne vertrauten Proxy (CHAT_TRUSTED_PROXY_HOPS) sieht die Route keine IP-Adresse. Dann zählen
// alle Anfragen als eine Adresse („unbekannt“), die Grenzen gelten also für alle zusammen. Bei der
// Anmeldung ist der Absender ohnehin der Server des Portals, nicht der Browser. Die Werte lassen
// der Demo viel Luft: ein Telefon, ein paar neue Fälle, eine Anmeldung.
import { createRateLimiter, type RateLimitConfig } from '@/lib/chat/guard';

const NONE = Number.MAX_SAFE_INTEGER;

type Limiter = ReturnType<typeof createRateLimiter>;

/** Ein Rate-Limit je Name und Prozess, auch wenn der Dev-Server das Modul neu auswertet */
function perProcess(name: string): Limiter {
  const store = globalThis as unknown as Record<symbol, Limiter | undefined>;
  const key = Symbol.for(`machs.rateLimit.${name}`);
  return (store[key] ??= createRateLimiter());
}

/** Neue Fälle aus der App (ohne X-Share-Token). Begrenzt, wie viele Fälle jemand im Netz anlegt. */
export const shareCreateRate: RateLimitConfig = {
  perWindow: 20,
  windowMs: 60_000,
  perDay: 500,
  dailyTotal: 2000,
};

/** Aktualisierungen mit X-Share-Token. Die App sendet nach jeder Änderung am Fall einmal. */
export const shareUpdateRate: RateLimitConfig = {
  perWindow: 120,
  windowMs: 60_000,
  perDay: 20_000,
  dailyTotal: 50_000,
};

export const shareRateLimits = {
  create: perProcess('share.create'),
  update: perProcess('share.update'),
};

/**
 * Anmeldung im Portal: zählt nur Fehlversuche, je IP-Adresse und je E-Mail. Nach 10 in
 * 10 Minuten ist Pause, bis der älteste aus dem Fenster fällt. Erfolgreiche Anmeldungen zählen
 * nicht. Keine Tagesgrenze: Sie würde das Konto bis Mitternacht sperren.
 */
export const loginRate: RateLimitConfig = {
  perWindow: 10,
  windowMs: 10 * 60_000,
  perDay: NONE,
  dailyTotal: NONE,
};

export const loginFailures = perProcess('login');
