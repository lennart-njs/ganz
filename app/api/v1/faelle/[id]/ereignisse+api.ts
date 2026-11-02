// App ← Backend: Antworten des Händlers seit einem Zeitpunkt (?seit=ISO-Zeit).
import { getCaseStore } from '@/server/backend';

export async function GET(request: Request, { id }: { id: string }): Promise<Response> {
  const token = request.headers.get('x-share-token') ?? '';
  const since = new URL(request.url).searchParams.get('seit') ?? undefined;
  const events = token ? await getCaseStore().retailerEvents(id, token, since) : null;
  if (!events) return Response.json({ error: 'token' }, { status: 403 });
  return Response.json({ events }, { headers: { 'Cache-Control': 'no-store' } });
}
