// Händlerportal: Fälle dieses Händlers. Nur, was Haushalte ausdrücklich an ihn gesendet haben.
import { getCaseStore } from '@/server/backend';
import { tenantFrom } from '@/server/backend/auth';

export async function GET(request: Request): Promise<Response> {
  const tenant = tenantFrom(request);
  if (!tenant) return Response.json({ error: 'anmeldung' }, { status: 401 });
  // Für die Liste reichen die Fotos ohne Bilddaten
  const cases = (await getCaseStore().listForTenant(tenant)).map((r) => ({
    ...r,
    file: { ...r.file, photos: r.file.photos.map(({ jpegBase64: _, ...p }) => p) },
  }));
  return Response.json({ tenant, cases }, { headers: { 'Cache-Control': 'no-store' } });
}
