// Prüft eine geteilte Fallakte aus der App, bevor sie gespeichert wird.
import { SHARE_FORMAT_VERSION, type SharedCaseFile } from '@/model/sharing';

export const shareLimits = {
  photos: 12,
  /** base64-Zeichen je Foto (ca. 375 KB) */
  photoChars: 500_000,
  timeline: 400,
  text: 2000,
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
  return f;
}
