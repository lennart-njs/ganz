// Begrenzt Missbrauch der Chat-Route: Pitch-Token, Rate-Limit je IP-Adresse und Installation,
// Tagesgrenze. Läuft nur auf dem Server (app/api/chat+api.ts), im Speicher des Prozesses.
// Das begrenzt Missbrauch, ist aber kein Schutz: Der Token steckt in der App und lässt sich
// auslesen, IP-Adresse und Installations-ID lassen sich wechseln. Ab Phase 5 gibt es Anmeldung.
import { CHAT_HEADERS, INSTALLATION_ID } from './protocol';

// ---------- Pitch-Token ----------

/** Vergleicht ohne frühen Abbruch, damit die Laufzeit nichts über den Token verrät */
function sameText(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

/**
 * Stimmt der Pitch-Token? Ohne CHAT_PITCH_TOKEN prüft die Route nichts (Entwicklung). Mehrere
 * Token mit Komma getrennt gelten alle, so lässt sich der Token wechseln, ohne dass ein Telefon
 * mit dem alten Build sofort ausfällt.
 */
export function pitchTokenOk(
  sent: string | null,
  configured: string | undefined = process.env.CHAT_PITCH_TOKEN,
): boolean {
  const tokens = (configured ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  if (tokens.length === 0) return true;
  if (!sent || sent.length > 200) return false;
  return tokens.some((t) => sameText(t, sent.trim()));
}

// ---------- Wer fragt ----------

/**
 * Schlüssel für das Rate-Limit: die IP-Adresse und, wenn die App sie schickt, die Installations-ID.
 * Die Adresse kommt aus dem letzten Eintrag von X-Forwarded-For, den setzt der Proxy vor dem
 * Server. Ohne Proxy zählen alle Anfragen als eine Adresse. null: Die Installations-ID hat eine
 * falsche Form.
 */
export function clientKeys(request: Request): string[] | null {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim();
  const ip = (forwarded || request.headers.get('x-real-ip')?.trim() || 'unbekannt').slice(0, 64);
  const installation = request.headers.get(CHAT_HEADERS.installation)?.trim();
  if (installation && !INSTALLATION_ID.test(installation)) return null;
  return [`ip:${ip}`, ...(installation ? [`installation:${installation}`] : [])];
}

// ---------- Rate-Limit ----------

export interface RateLimitConfig {
  /** Anfragen je Schlüssel im Fenster */
  perWindow: number;
  windowMs: number;
  /** Anfragen je Schlüssel an einem Tag (UTC) */
  perDay: number;
  /** Anfragen insgesamt an einem Tag, je Prozess. Begrenzt die Kosten. */
  dailyTotal: number;
}

/** Zahl aus der Umgebung, sonst der Standard */
const positive = (value: string | undefined, fallback: number) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
};

/** Grenzen der Route. CHAT_RATE_PER_MINUTE und CHAT_DAILY_LIMIT überschreiben sie. */
export function rateConfig(env: Record<string, string | undefined> = process.env): RateLimitConfig {
  return {
    perWindow: positive(env.CHAT_RATE_PER_MINUTE, 10),
    windowMs: 60_000,
    perDay: positive(env.CHAT_RATE_PER_DAY, 200),
    dailyTotal: positive(env.CHAT_DAILY_LIMIT, 1000),
  };
}

export type RateDecision =
  { ok: true } | { ok: false; reason: 'zu_viele' | 'tagesgrenze'; retryAfterS: number };

interface Hits {
  day: string;
  today: number;
  /** Zeitpunkte im aktuellen Fenster */
  recent: number[];
}

const dayOf = (t: number) => new Date(t).toISOString().slice(0, 10);

/** Sekunden bis Mitternacht (UTC) */
const untilTomorrow = (t: number) => {
  const d = new Date(t);
  return Math.ceil((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1) - t) / 1000);
};

/**
 * Rate-Limit im Speicher. Eine Anfrage zählt nur, wenn sie durchgeht. Abgelehnte Anfragen kosten
 * nichts, also zählen sie nicht. Am neuen Tag fallen alte Schlüssel weg, so wächst der Speicher
 * höchstens mit den Anfragen eines Tages.
 */
export function createRateLimiter(now: () => number = () => Date.now()) {
  const hits = new Map<string, Hits>();
  let total = { day: '', count: 0 };

  function take(keys: string[], config: RateLimitConfig = rateConfig()): RateDecision {
    const t = now();
    const day = dayOf(t);
    const from = t - config.windowMs;
    if (total.day !== day) {
      total = { day, count: 0 };
      for (const [key, h] of hits) {
        if (h.day !== day && h.recent.every((x) => x <= from)) hits.delete(key);
      }
    }
    if (total.count >= config.dailyTotal) {
      return { ok: false, reason: 'tagesgrenze', retryAfterS: untilTomorrow(t) };
    }
    const current = keys.map((key): [string, Hits] => {
      const h = hits.get(key);
      const recent = (h?.recent ?? []).filter((x) => x > from);
      return [key, h?.day === day ? { ...h, recent } : { day, today: 0, recent }];
    });
    for (const [, h] of current) {
      if (h.today >= config.perDay) {
        return { ok: false, reason: 'tagesgrenze', retryAfterS: untilTomorrow(t) };
      }
      if (h.recent.length >= config.perWindow) {
        const retry = Math.ceil((h.recent[0]! + config.windowMs - t) / 1000);
        return { ok: false, reason: 'zu_viele', retryAfterS: Math.max(1, retry) };
      }
    }
    for (const [key, h] of current) {
      hits.set(key, { day, today: h.today + 1, recent: [...h.recent, t] });
    }
    total.count += 1;
    return { ok: true };
  }

  return {
    take,
    /** Für Tests: alles vergessen */
    reset: () => {
      hits.clear();
      total = { day: '', count: 0 };
    },
    /** Für Tests: Zahl der gemerkten Schlüssel */
    size: () => hits.size,
  };
}

/** Das Rate-Limit der Route, eines je Prozess */
export const chatRateLimit = createRateLimiter();
