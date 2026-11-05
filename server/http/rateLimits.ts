// Rate-Limits der Route für Fälle aus der App. Dasselbe Rate-Limit
// wie die Chat-Route (lib/chat/guard.ts), im Speicher des Prozesses. Expo bündelt jede Route
// einzeln, darum hat jede Route ihre eigenen Zähler.
//
// Ohne vertrauten Proxy (CHAT_TRUSTED_PROXY_HOPS) sieht die Route keine IP-Adresse. Dann zählen
// alle Anfragen als eine Adresse („unbekannt“), die Grenzen gelten also für alle zusammen. Die
// Werte sind so gewählt, dass die Demo und die Tests weit darunter bleiben.
import { createRateLimiter, type RateLimitConfig } from '@/lib/chat/guard';

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
  create: createRateLimiter(),
  update: createRateLimiter(),
};
