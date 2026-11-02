// App → Backend: Widerruf der Weitergabe. Danach sieht der Händler keine Personendaten mehr.
import { getCaseStore } from '@/server/backend';

export async function DELETE(request: Request, { id }: { id: string }): Promise<Response> {
  const token = request.headers.get('x-share-token') ?? '';
  const ok = token ? await getCaseStore().revokeShare(id, token) : false;
  return Response.json(ok ? { ok } : { error: 'token' }, { status: ok ? 200 : 403 });
}
