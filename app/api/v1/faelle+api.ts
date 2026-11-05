// App → Backend: Fallakte nach deiner Bestätigung teilen oder aktualisieren (Entscheidung 28).
// Beim ersten Mal gibt der Server ein Token zurück. Nur wer es kennt, darf den Fall ändern,
// widerrufen und die Antworten des Händlers lesen. Ereignisse, die dabei entstehen (Begrüßung,
// Rückfrage nach dem Kaufbeleg), kommen gleich mit, damit sie sofort im Gespräch stehen.
// Die App hat kein Konto. Darum begrenzt die Route, was jemand im selben Netz anlegen kann:
// Rate-Limit vor dem Lesen, nur bekannte Händler als Empfänger, keine Fallnummer und keine
// Bestätigung zweimal (server/backend/fileStore.ts).
import { clientKeys } from '@/lib/chat/guard';
import { getCaseStore } from '@/server/backend';
import { knownRecipient, parseSharedCaseFile } from '@/server/backend/validate';
import { bodyLimits, readJson } from '@/server/http/readJson';
import { shareCreateRate, shareRateLimits, shareUpdateRate } from '@/server/http/rateLimits';

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });

const status = { token: 403, widerrufen: 410, doppelt: 409 } as const;

export async function POST(request: Request): Promise<Response> {
  const token = request.headers.get('x-share-token') || undefined;
  // Vor dem Lesen: Ein großer Body kostet, auch wenn er nichts anlegt
  const keys = clientKeys(request);
  if (!keys) return json({ error: 'ungueltig' }, 400);
  const rate = token
    ? shareRateLimits.update.take(keys, shareUpdateRate)
    : shareRateLimits.create.take(keys, shareCreateRate);
  if (!rate.ok)
    return json({ error: rate.reason }, 429, { 'Retry-After': String(rate.retryAfterS) });

  const read = await readJson(request, bodyLimits.share);
  if (!read.ok) return json({ error: read.error }, read.status);
  const file = parseSharedCaseFile((read.body as { file?: unknown } | null)?.file);
  if (!file) return json({ error: 'ungueltig' }, 400);
  if (!knownRecipient(file.recipient)) return json({ error: 'empfaenger' }, 400);
  const result = await getCaseStore().upsertShare(file, token);
  if (!result.ok) return json({ error: result.reason }, status[result.reason]);
  return json({ token: result.token, events: result.events });
}
