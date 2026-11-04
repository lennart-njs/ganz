// App → Backend: Fallakte nach deiner Bestätigung teilen oder aktualisieren (Entscheidung 28).
// Beim ersten Mal gibt der Server ein Token zurück. Nur wer es kennt, darf den Fall ändern,
// widerrufen und die Antworten des Händlers lesen. Ereignisse, die dabei entstehen (Begrüßung,
// Rückfrage nach dem Kaufbeleg), kommen gleich mit, damit sie sofort im Gespräch stehen.
import { getCaseStore } from '@/server/backend';
import { parseSharedCaseFile } from '@/server/backend/validate';
import { bodyLimits, readJson } from '@/server/http/readJson';

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(request: Request): Promise<Response> {
  const read = await readJson(request, bodyLimits.share);
  if (!read.ok) return json({ error: read.error }, read.status);
  const file = parseSharedCaseFile((read.body as { file?: unknown } | null)?.file);
  if (!file) return json({ error: 'ungueltig' }, 400);
  const token = request.headers.get('x-share-token') ?? undefined;
  const result = await getCaseStore().upsertShare(file, token);
  if (!result.ok) return json({ error: result.reason }, result.reason === 'token' ? 403 : 410);
  return json({ token: result.token, events: result.events });
}
