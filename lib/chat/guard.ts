// Begrenzt Missbrauch der Chat-Route: Pitch-Token, Rate-Limit je IP-Adresse und Installation,
// Tagesgrenze. Läuft nur auf dem Server (app/api/chat+api.ts), im Speicher des Prozesses.
// Das begrenzt Missbrauch, ist aber kein Schutz: Der Token steckt in der App und lässt sich
// auslesen, die Installations-ID lässt sich wechseln, eine Adresse hinter einem Proxy auch. Ab
// Phase 5 gibt es Anmeldung. Das Rate-Limit und die IP-Adresse nutzen auch die Routen für Fälle
// aus der App und für die Anmeldung im Portal (server/http/rateLimits.ts).
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
 * Wie viele Proxys vor der Route Einträge an X-Forwarded-For hängen (CHAT_TRUSTED_PROXY_HOPS).
 * Ohne Angabe: keiner. Dann schreibt jeden Eintrag der Client selbst, etwa auf dem Dev-Server.
 */
export function trustedProxyHops(env: Record<string, string | undefined> = process.env): number {
  const n = Number(env.CHAT_TRUSTED_PROXY_HOPS);
  return Number.isInteger(n) && n > 0 ? Math.min(n, 10) : 0;
}

/**
 * Schlüssel für das Rate-Limit: die IP-Adresse und, wenn die App sie schickt, die Installations-ID.
 * X-Forwarded-For und X-Real-IP gelten nur, wenn CHAT_TRUSTED_PROXY_HOPS sagt, dass ein Proxy davor
 * steht. Dann zählt der Eintrag, den der äußerste vertraute Proxy anhängte (n-ter von hinten).
 * Davor kann der Client alles schreiben. Ohne Proxy zählen alle Anfragen als eine Adresse
 * („unbekannt“), sonst könnte jede Anfrage eine neue Adresse nennen. null: Die Installations-ID
 * hat eine falsche Form.
 */
export function clientKeys(
  request: Request,
  env: Record<string, string | undefined> = process.env,
): string[] | null {
  const installation = request.headers.get(CHAT_HEADERS.installation)?.trim();
  if (installation && !INSTALLATION_ID.test(installation)) return null;
  return [
    `ip:${clientIp(request, env)}`,
    ...(installation ? [`installation:${installation}`] : []),
  ];
}

/** Die IP-Adresse wie bei clientKeys, ohne Installation. Ohne vertrauten Proxy: „unbekannt“. */
export function clientIp(
  request: Request,
  env: Record<string, string | undefined> = process.env,
): string {
  const hops = trustedProxyHops(env);
  const forwarded = hops
    ? request.headers
        .get('x-forwarded-for')
        ?.split(',')
        .map((x) => x.trim())
        .at(-hops)
    : undefined;
  const real = hops ? request.headers.get('x-real-ip')?.trim() : undefined;
  return (forwarded || real || 'unbekannt').slice(0, 64);
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

  /** Stand der Schlüssel jetzt und ob eine weitere Anfrage durchginge. Zählt nichts. */
  function evaluate(keys: string[], config: RateLimitConfig) {
    const t = now();
    const day = dayOf(t);
    const from = t - config.windowMs;
    if (total.day !== day) {
      total = { day, count: 0 };
      for (const [key, h] of hits) {
        if (h.day !== day && h.recent.every((x) => x <= from)) hits.delete(key);
      }
    }
    const current = keys.map((key): [string, Hits] => {
      const h = hits.get(key);
      const recent = (h?.recent ?? []).filter((x) => x > from);
      return [key, h?.day === day ? { ...h, recent } : { day, today: 0, recent }];
    });
    const decide = (): RateDecision => {
      if (total.count >= config.dailyTotal) {
        return { ok: false, reason: 'tagesgrenze', retryAfterS: untilTomorrow(t) };
      }
      for (const [, h] of current) {
        if (h.today >= config.perDay) {
          return { ok: false, reason: 'tagesgrenze', retryAfterS: untilTomorrow(t) };
        }
        if (h.recent.length >= config.perWindow) {
          const retry = Math.ceil((h.recent[0]! + config.windowMs - t) / 1000);
          return { ok: false, reason: 'zu_viele', retryAfterS: Math.max(1, retry) };
        }
      }
      return { ok: true };
    };
    const count = () => {
      for (const [key, h] of current) {
        hits.set(key, { day, today: h.today + 1, recent: [...h.recent, t] });
      }
      total.count += 1;
    };
    return { decision: decide(), count };
  }

  /** Prüft und zählt die Anfrage, wenn sie durchgeht */
  function take(keys: string[], config: RateLimitConfig = rateConfig()): RateDecision {
    const { decision, count } = evaluate(keys, config);
    if (decision.ok) count();
    return decision;
  }

  return {
    take,
    /**
     * Nur prüfen, nichts zählen. Mit record zusammen für Grenzen, die nur Fehlschläge zählen
     * (Anmeldung im Portal): erst check, nach einem Fehlschlag record.
     */
    check: (keys: string[], config: RateLimitConfig = rateConfig()) =>
      evaluate(keys, config).decision,
    /** Zählt eine Anfrage, ohne zu prüfen */
    record: (keys: string[], config: RateLimitConfig = rateConfig()) => {
      evaluate(keys, config).count();
    },
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
