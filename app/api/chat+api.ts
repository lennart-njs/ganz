// Reparatur-Assistent: Proxy zu Claude. Läuft auf dem Expo-Dev-Server (oder einem eigenen Server),
// nie in der App. Der Schlüssel kommt aus ANTHROPIC_API_KEY in .env und verlässt den Rechner nicht.
import Anthropic from '@anthropic-ai/sdk';

import {
  STABLE_SYSTEM,
  caseSystem,
  catalogSystem,
  parseReply,
  parseRequest,
  replySchemaFor,
  type ChatTurn,
} from '@/lib/chat/prompt';
import { findCatalogEntry, guidesForDevice } from '@/lib/guideCatalog';
import { loadApprovedCatalog } from '@/server/guides/catalogStore';

const MODEL = 'claude-opus-5-5';

let client: Anthropic | undefined;
function getClient(): Anthropic {
  client ??= new Anthropic();
  return client;
}

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

function toMessages(turns: ChatTurn[]): Anthropic.Beta.BetaMessageParam[] {
  return turns.map((m) =>
    m.image
      ? {
          role: 'user',
          // Bild vor dem Text. Der Server speichert es nicht.
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: m.image.mediaType, data: m.image.data },
            },
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
  const input = parseRequest(body);
  if (!input) return json({ error: 'ungueltig' }, 400);

  // Nur geprüfte Anleitungen für genau dieses Gerät, aus dem Katalog des Servers (Entscheidung 15)
  loadApprovedCatalog();
  const ctx = input.context;
  const device = {
    manufacturerId: ctx.manufacturerId,
    category: ctx.category,
    model: ctx.device,
    materialNumber: ctx.materialNumber,
  };
  const entry = findCatalogEntry(device);
  const guides = guidesForDevice(device);
  const guideIds = guides.map((g) => g.id);

  try {
    const response = await getClient().beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      // Kurze Chat-Antworten: wenig Aufwand reicht, Thinking bleibt adaptiv
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: replySchemaFor(guideIds) },
      },
      // Lehnt ein Sicherheitsfilter ab, versucht der Server es mit dem empfohlenen Ersatzmodell
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: [
        // Regeln sind für alle Fälle gleich, der Katalog für alle Fälle desselben Modells: beides gecacht
        { type: 'text', text: STABLE_SYSTEM, cache_control: { type: 'ephemeral' } },
        {
          type: 'text',
          text: catalogSystem(guides, entry?.document.title),
          cache_control: { type: 'ephemeral' },
        },
        { type: 'text', text: caseSystem(input.context) },
      ],
      messages: toMessages(input.messages),
    });

    if (response.stop_reason === 'refusal') return json({ error: 'abgelehnt' }, 422);
    if (response.stop_reason === 'max_tokens') return json({ error: 'zu_lang' }, 502);

    const text = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');
    const reply = parseReply(text, { category: ctx.category, guideIds });
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
