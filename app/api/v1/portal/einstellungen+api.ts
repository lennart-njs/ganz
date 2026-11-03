// Händlerportal: Einstellungen des Händlers. Speichern geht abschnittsweise.
import { getCaseStore } from '@/server/backend';
import { tenantFrom } from '@/server/backend/auth';
import { parseSettingsSection } from '@/server/backend/validate';

const noStore = { 'Cache-Control': 'no-store' };

export async function GET(request: Request): Promise<Response> {
  const tenant = tenantFrom(request);
  if (!tenant) return Response.json({ error: 'anmeldung' }, { status: 401 });
  const settings = await getCaseStore().getSettings(tenant);
  return Response.json({ tenant, settings }, { headers: noStore });
}

export async function PUT(request: Request): Promise<Response> {
  const tenant = tenantFrom(request);
  if (!tenant) return Response.json({ error: 'anmeldung' }, { status: 401 });
  let body: { section?: unknown; value?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: 'ungueltig' }, { status: 400 });
  }
  const store = getCaseStore();
  const next = parseSettingsSection(body.section, body.value, await store.getSettings(tenant));
  if (!next) return Response.json({ error: 'ungueltig' }, { status: 400 });
  const settings = await store.saveSettings(tenant, next);
  return Response.json({ settings }, { headers: noStore });
}
