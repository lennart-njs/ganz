// Reparatur-Assistent: Proxy zu Claude. Läuft auf dem Expo-Dev-Server (oder einem eigenen Server),
// nie in der App. Der Schlüssel kommt aus ANTHROPIC_API_KEY in .env und verlässt den Rechner nicht.
import Anthropic from '@anthropic-ai/sdk';

import { fitsRequest } from '@/lib/chat/limits';
import {
  STABLE_SYSTEM,
  caseSystem,
  householdDetails,
  parseReply,
  parseRequest,
  replySchema,
  type ChatContext,
  type ChatTurn,
} from '@/lib/chat/prompt';

const MODEL = 'claude-opus-5-5';

let client: Anthropic | undefined;
function getClient(): Anthropic {
  client ??= new Anthropic();
  return client;
}

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

/**
 * Der Verlauf für Claude. Was der Haushalt selbst angegeben hat (Problem, unbekanntes Modell), steht
 * als eigener Block vor seiner ersten Nachricht, nie im Systemblock.
 */
function toMessages(context: ChatContext, turns: ChatTurn[]): Anthropic.Beta.BetaMessageParam[] {
  return turns.map((m, i) =>
    i === 0
      ? {
          role: 'user',
          content: [
            { type: 'text', text: householdDetails(context) },
            { type: 'text', text: m.text },
          ],
        }
      : { role: m.role === 'haushalt' ? 'user' : 'assistant', content: m.text },
  );
}

export async function POST(request: Request): Promise<Response> {
  if (!process.env.ANTHROPIC_API_KEY) return json({ error: 'kein_schluessel' }, 503);

  let body: unknown;
  try {
    body = await request.json();
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

  try {
    const response = await getClient().beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      // Kurze Chat-Antworten: wenig Aufwand reicht, Thinking bleibt adaptiv
      output_config: { effort: 'low', format: { type: 'json_schema', schema: replySchema } },
      // Lehnt ein Sicherheitsfilter ab, versucht der Server es mit dem empfohlenen Ersatzmodell
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: [
        // Regeln und Anleitungen sind für alle Fälle gleich und werden gecacht
        { type: 'text', text: STABLE_SYSTEM, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: caseSystem(input.context) },
      ],
      messages: toMessages(input.context, input.messages),
    });

    if (response.stop_reason === 'refusal') return json({ error: 'abgelehnt' }, 422);
    if (response.stop_reason === 'max_tokens') return json({ error: 'zu_lang' }, 502);

    const text = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');
    const reply = parseReply(text, input.context.category);
    if (!reply) return json({ error: 'format' }, 502);
    return json(reply);
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) return json({ error: 'schluessel' }, 503);
    if (error instanceof Anthropic.RateLimitError) return json({ error: 'ausgelastet' }, 429);
    if (error instanceof Anthropic.APIError) {
      console.error(`Claude API ${error.status}: ${error.message}`);
      return json({ error: 'dienst' }, 502);
    }
    console.error(error);
    return json({ error: 'dienst' }, 502);
  }
}
