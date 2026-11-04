// Liest einen JSON-Body mit Obergrenze in Bytes. Nennt Content-Length mehr, liest die Route nichts.
// Ohne Content-Length (chunked) zählt sie beim Lesen mit und bricht den Stream an der Grenze ab,
// statt erst alles in den Speicher zu holen. Nichts davon wird geloggt.
export type ReadJson =
  | { ok: true; body: unknown }
  | { ok: false; status: 400; error: 'ungueltig' }
  | { ok: false; status: 413; error: 'zu_gross' };

const invalid = { ok: false, status: 400, error: 'ungueltig' } as const;
const tooLarge = { ok: false, status: 413, error: 'zu_gross' } as const;

/** Obergrenzen je Route in Bytes */
export const bodyLimits = {
  /** Fallakte mit bis zu 12 Fotos (server/backend/validate.ts, shareLimits) und Text */
  share: 8_000_000,
  /** Anmeldung, Aktionen, Bearbeitung, Einstellungen, Sammelaktion im Portal */
  portal: 256_000,
} as const;

/** Die Bytes des Bodys bis maxBytes. 'zu_gross': abgebrochen, null: nicht lesbar. */
async function readBytes(
  request: Request,
  maxBytes: number,
): Promise<Uint8Array | 'zu_gross' | null> {
  if (!request.body) return new Uint8Array(0);
  let reader: ReadableStreamDefaultReader<Uint8Array>;
  try {
    reader = request.body.getReader();
  } catch {
    return null;
  }
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        // Nicht weiterlesen. Die Antwort 413 geht trotzdem raus (geprüft am Dev-Server mit curl).
        void reader.cancel().catch(() => undefined);
        return 'zu_gross';
      }
      chunks.push(value);
    }
  } catch {
    return null;
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export async function readJson(request: Request, maxBytes: number): Promise<ReadJson> {
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > maxBytes) return tooLarge;
  const bytes = await readBytes(request, maxBytes);
  if (bytes === 'zu_gross') return tooLarge;
  if (!bytes) return invalid;
  try {
    return { ok: true, body: JSON.parse(new TextDecoder().decode(bytes)) };
  } catch {
    return invalid;
  }
}
