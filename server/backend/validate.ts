// Prüft eine geteilte Fallakte aus der App und Einstellungen aus dem Portal, bevor sie gespeichert werden.
import { demoConfig } from '@/config/demo.config';
import { fruendSettings } from '@/config/portal.demo';
import { settingsSections, type DealerSettings, type SettingsSection } from '@/model/portal';
import { SHARE_FORMAT_VERSION, type SharedCaseFile } from '@/model/sharing';

export const shareLimits = {
  photos: 12,
  /** base64-Zeichen je Foto (ca. 375 KB) */
  photoChars: 500_000,
  timeline: 400,
  text: 2000,
  messages: 200,
} as const;

const str = (x: unknown, max: number = shareLimits.text) =>
  typeof x === 'string' && x.length <= max;

export function parseSharedCaseFile(body: unknown): SharedCaseFile | null {
  if (!body || typeof body !== 'object') return null;
  const f = body as SharedCaseFile;
  if (f.version !== SHARE_FORMAT_VERSION) return null;
  if (!str(f.caseId, 40) || !/^[A-Za-z0-9-]+$/.test(f.caseId)) return null;
  if (!f.recipient || f.recipient.kind !== 'haendler' || !str(f.recipient.id, 80)) return null;
  if (!str(f.consentId, 80) || !str(f.sharedAt, 40) || !str(f.updatedAt, 40)) return null;
  if (!f.customer || !str(f.customer.name, 200)) return null;
  if (!f.device || !str(f.device.model, 200) || !str(f.device.manufacturer, 200)) return null;
  if (!f.case || !str(f.case.problemLabel) || !str(f.case.status, 40)) return null;
  if (!Array.isArray(f.photos) || f.photos.length > shareLimits.photos) return null;
  const photosOk = f.photos.every(
    (p) =>
      str(p.id, 80) &&
      (p.jpegBase64 === undefined ||
        (str(p.jpegBase64, shareLimits.photoChars) && /^[A-Za-z0-9+/=]+$/.test(p.jpegBase64))),
  );
  if (!photosOk) return null;
  if (!Array.isArray(f.timeline) || f.timeline.length > shareLimits.timeline) return null;
  if (!f.timeline.every((x) => str(x.label) && str(x.at, 40))) return null;
  if (!Array.isArray(f.results) || !Array.isArray(f.answers)) return null;
  if (!f.answers.every((a) => str(a.questionEventId, 80) && str(a.answer, 500))) return null;
  if (f.messages !== undefined) {
    if (!Array.isArray(f.messages) || f.messages.length > shareLimits.messages) return null;
    const ok = f.messages.every(
      (m) =>
        str(m.id, 80) &&
        str(m.at, 40) &&
        str(m.text) &&
        (m.photoId === undefined || str(m.photoId, 80)),
    );
    if (!ok) return null;
  }
  if (f.rating !== undefined && !(Number.isInteger(f.rating) && f.rating >= 1 && f.rating <= 5))
    return null;
  return f;
}

/**
 * Geht der Fall an einen Händler, den das Backend kennt? Heute die Händler aus der Demo
 * (config/demo.config.ts), später die Händler mit Konto. Sonst sähe ihn niemand, und jeder im
 * Netz könnte unter beliebigen Namen Fälle anlegen.
 */
export function knownRecipient(recipient: SharedCaseFile['recipient']): boolean {
  return demoConfig.dealers.some((d) => d.id === recipient.id);
}

// ---------- Einstellungen des Händlers ----------

/** Felder, die fehlen dürfen */
const OPTIONAL = new Set(['branchId', 'avvSignedAt']);
const LIST_MAX = 100;

/**
 * Prüft einen Wert gegen die Form der Vorlage (Standardeinstellungen): gleiche Schlüssel, gleiche
 * Typen, Texte bis 2000 Zeichen, Listen bis 100 Einträge. Unbekannte Schlüssel fallen weg.
 */
function shaped(value: unknown, template: unknown): unknown {
  if (typeof template === 'string') return str(value) ? (value as string) : undefined;
  if (typeof template === 'number')
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1e9
      ? value
      : undefined;
  if (typeof template === 'boolean') return typeof value === 'boolean' ? value : undefined;
  if (Array.isArray(template)) {
    if (!Array.isArray(value) || value.length > LIST_MAX) return undefined;
    const item = template[0] ?? '';
    const out = value.map((v) => shaped(v, item));
    return out.every((v) => v !== undefined) ? out : undefined;
  }
  if (template && typeof template === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    const out: Record<string, unknown> = {};
    for (const [k, t] of Object.entries(template)) {
      const v = (value as Record<string, unknown>)[k];
      if (v === undefined && OPTIONAL.has(k)) continue;
      const x = shaped(v, t);
      if (x === undefined) return undefined;
      out[k] = x;
    }
    for (const k of OPTIONAL) {
      const v = (value as Record<string, unknown>)[k];
      if (v !== undefined && !(k in template)) {
        if (!str(v, 80)) return undefined;
        out[k] = v;
      }
    }
    return out;
  }
  return undefined;
}

/** Ein Abschnitt der Einstellungen aus dem Portal. null: ungültig. */
export function parseSettingsSection(
  section: unknown,
  value: unknown,
  current: DealerSettings,
): DealerSettings | null {
  if (!settingsSections.includes(section as SettingsSection)) return null;
  const key = section as SettingsSection;
  if (key === 'integrations') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length > LIST_MAX) return null;
    const ok = entries.every(
      ([k, v]) => /^[a-z0-9-]{1,40}$/.test(k) && (v === 'verbunden' || v === 'getrennt'),
    );
    return ok ? { ...current, integrations: value as DealerSettings['integrations'] } : null;
  }
  const next = shaped(value, fruendSettings[key]);
  return next === undefined ? null : { ...current, [key]: next };
}
