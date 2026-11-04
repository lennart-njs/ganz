// Händlerportal: Einstellungen des Händlers. Speichern geht abschnittsweise.
import { getCaseStore } from '@/server/backend';
import { tenantFrom } from '@/server/backend/auth';
import { parseSettingsSection } from '@/server/backend/validate';
import { bodyLimits, readJson } from '@/server/http/readJson';

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
  const read = await readJson(request, bodyLimits.portal);
  if (!read.ok) return Response.json({ error: read.error }, { status: read.status });
  const body = (read.body ?? {}) as { section?: unknown; value?: unknown };
  const store = getCaseStore();
  const next = parseSettingsSection(body.section, body.value, await store.getSettings(tenant));
  if (!next) return Response.json({ error: 'ungueltig' }, { status: 400 });
  const settings = await store.saveSettings(tenant, next);
  return Response.json({ settings }, { headers: noStore });
}
