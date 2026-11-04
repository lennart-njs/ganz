// Reparatur-Assistent: Proxy zu Claude. Läuft auf dem Expo-Dev-Server (oder einem eigenen Server),
// nie in der App. Der Schlüssel kommt aus ANTHROPIC_API_KEY in .env und verlässt den Rechner nicht.
import Anthropic from '@anthropic-ai/sdk';

import { chatRateLimit, clientKeys, pitchTokenOk } from '@/lib/chat/guard';
import { chatMaxBodyBytes, fitsRequest } from '@/lib/chat/limits';
import { CHAT_HEADERS } from '@/lib/chat/protocol';
import {
  STABLE_SYSTEM,
  caseSystem,
  catalogSystem,
  deviceCatalog,
  householdDetails,
  parseReply,
  parseRequest,
  replySchemaFor,
  type ChatContext,
  type ChatTurn,
} from '@/lib/chat/prompt';
import { loadApprovedCatalog } from '@/server/guides/catalogStore';

const MODEL = 'claude-opus-5-5';

let client: Anthropic | undefined;
function getClient(): Anthropic {
  client ??= new Anthropic();
  return client;
}

/**
 * Log ohne Inhalte: nur Status, Fehlerart und Anfrage-Nummer. Keine Nachricht, kein Kontext, kein
 * Foto, keine Fehlermeldung, denn auch die kann Teile der Anfrage zitieren. Keine IP-Adresse, keine
 * Installation.
 */
function logFailure(...parts: (string | number | null | undefined)[]) {
  console.error(parts.filter((p) => p !== undefined && p !== null && p !== '').join(' '));
}

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });

/**
 * Der Verlauf für Claude. Was der Haushalt selbst angegeben hat (Problem, unbekanntes Modell), steht
 * als eigener Block vor seiner ersten Nachricht, nie im Systemblock. Ein Foto steht vor dem Text
 * seiner Nachricht. Der Server speichert es nicht.
 */
function toMessages(context: ChatContext, turns: ChatTurn[]): Anthropic.Beta.BetaMessageParam[] {
  return turns.map((m, i) => {
    if (m.role === 'assistent') return { role: 'assistant', content: m.text };
    const content: Anthropic.Beta.BetaContentBlockParam[] = [];
    if (m.image) {
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: m.image.mediaType, data: m.image.data },
      });
    }
    if (i === 0) content.push({ type: 'text', text: householdDetails(context) });
    content.push({ type: 'text', text: m.text });
    return { role: 'user', content };
  });
}

export async function POST(request: Request): Promise<Response> {
  // Missbrauch begrenzen, bevor etwas Geld kostet (lib/chat/guard.ts). Kein Schutz, nur eine Grenze.
  if (!pitchTokenOk(request.headers.get(CHAT_HEADERS.token))) {
    return json({ error: 'token' }, 401);
  }
  const keys = clientKeys(request);
  if (!keys) return json({ error: 'ungueltig' }, 400);
  const rate = chatRateLimit.take(keys);
  if (!rate.ok) {
    return json({ error: rate.reason }, 429, { 'Retry-After': String(rate.retryAfterS) });
  }

  if (!process.env.ANTHROPIC_API_KEY) return json({ error: 'kein_schluessel' }, 503);

  // Zu große Anfragen gar nicht erst lesen
  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > chatMaxBodyBytes) return json({ error: 'ungueltig' }, 400);
  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > chatMaxBodyBytes) return json({ error: 'ungueltig' }, 400);
    body = JSON.parse(raw);
  } catch {
    return json({ error: 'ungueltig' }, 400);
  }
  // Ein Gespräch hat höchstens chatLimits.messages Nachrichten, die Antwort mitgezählt. Danach
  // hilft die Fachkraft weiter (R-11). Die App schickt dann nichts mehr, die Route prüft es trotzdem.
  const messages = (body as { messages?: unknown } | null)?.messages;
  if (Array.isArray(messages) && !fitsRequest(messages.length)) {
    return json({ error: 'voll' }, 413);
  }
  const input = parseRequest(body);
  if (!input) return json({ error: 'ungueltig' }, 400);

  // Nur geprüfte Anleitungen für genau dieses Gerät, aus dem Katalog des Servers (Entscheidung 24)
  loadApprovedCatalog();
  const cat = deviceCatalog(input.context);
  const image = !!input.messages.at(-1)?.image;

  try {
    const response = await getClient().beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      // Kurze Chat-Antworten: wenig Aufwand reicht, Thinking bleibt adaptiv
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: replySchemaFor(cat.guideIds) },
      },
      // Lehnt ein Sicherheitsfilter ab, versucht der Server es mit dem empfohlenen Ersatzmodell
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: [
        // Regeln sind für alle Fälle gleich, der Katalog für alle Fälle desselben Modells: beides gecacht
        { type: 'text', text: STABLE_SYSTEM, cache_control: { type: 'ephemeral' } },
        {
          type: 'text',
          text: catalogSystem(cat.guides, cat.entry?.document.title),
          cache_control: { type: 'ephemeral' },
        },
        { type: 'text', text: caseSystem(input.context, cat) },
      ],
      messages: toMessages(input.context, input.messages),
    });

    if (response.stop_reason === 'refusal') return json({ error: 'abgelehnt' }, 422);
    if (response.stop_reason === 'max_tokens') return json({ error: 'zu_lang' }, 502);

    const text = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');
    const reply = parseReply(text, { guideIds: cat.guideIds, image });
    if (!reply) return json({ error: 'format' }, 502);
    return json(reply);
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) return json({ error: 'schluessel' }, 503);
    if (error instanceof Anthropic.RateLimitError) return json({ error: 'ausgelastet' }, 429);
    if (error instanceof Anthropic.APIError) {
      logFailure('Claude API', error.status, error.type, error.requestID);
      return json({ error: 'dienst' }, 502);
    }
    logFailure('Chat-Route', error instanceof Error ? error.name : typeof error);
    return json({ error: 'dienst' }, 502);
  }
}
