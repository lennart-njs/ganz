// Reparatur-Assistent: Die App fragt den eigenen Server (app/api/chat+api.ts), nie Claude direkt.
// Die Adresse kommt aus EXPO_PUBLIC_API_URL. Ohne sie löst Expo den relativen Pfad gegen den
// Dev-Server auf, das geht nur, solange `npx expo start` läuft. Hier wird nichts geloggt.
import { CHAT_HEADERS, CHAT_PATH } from '@/lib/chat/protocol';
import type { ChatContext, ChatReply, ChatTurn } from '@/lib/chat/prompt';

import { installationId } from './installation';

export type ChatError =
  | 'kein_schluessel'
  | 'schluessel'
  | 'abgelehnt'
  | 'ausgelastet'
  | 'netz'
  | 'dienst'
  /** 401: Der Pitch-Token fehlt oder ist alt (CHAT_PITCH_TOKEN auf dem Server) */
  | 'token'
  /** 429: viele Anfragen in kurzer Zeit, gleich geht es wieder */
  | 'zu_viele'
  /** 429: Für heute ist die Grenze erreicht */
  | 'tagesgrenze'
  /** Das Gespräch hat die Grenze erreicht (lib/chat/limits.ts). Weiter hilft die Fachkraft. */
  | 'voll';

export type ChatResult = { ok: true; reply: ChatReply } | { ok: false; error: ChatError };

export interface ChatService {
  ask(context: ChatContext, messages: ChatTurn[]): Promise<ChatResult>;
}

const known: ChatError[] = [
  'kein_schluessel',
  'schluessel',
  'abgelehnt',
  'ausgelastet',
  'voll',
  'token',
  'zu_viele',
  'tagesgrenze',
];

/** Fehler zu einer Antwort ohne Erfolg. Ohne bekannten Fehler im Body entscheidet der Status. */
function errorFor(status: number, data: unknown): ChatError {
  const error = (data as { error?: string } | null)?.error as ChatError | undefined;
  if (error && known.includes(error)) return error;
  if (status === 401 || status === 403) return 'token';
  if (status === 429) return 'zu_viele';
  if (status === 413) return 'voll';
  return 'dienst';
}

/** Adresse der Route: EXPO_PUBLIC_API_URL davor, sonst der relative Pfad für den Dev-Server */
export function chatUrl(base: string | undefined = process.env.EXPO_PUBLIC_API_URL): string {
  const root = base?.trim().replace(/\/+$/, '');
  return root ? `${root}${CHAT_PATH}` : CHAT_PATH;
}

/** Pitch-Token und Installations-ID für die Route. Nichts davon steht im Body. */
async function headers(): Promise<Record<string, string>> {
  const out: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = process.env.EXPO_PUBLIC_CHAT_TOKEN;
  if (token) out[CHAT_HEADERS.token] = token;
  const installation = await installationId();
  if (installation) out[CHAT_HEADERS.installation] = installation;
  return out;
}

export const httpChatService: ChatService = {
  async ask(context, messages) {
    let res: Response;
    try {
      res = await fetch(chatUrl(), {
        method: 'POST',
        headers: await headers(),
        body: JSON.stringify({ context, messages }),
      });
    } catch {
      return { ok: false, error: 'netz' };
    }
    let data: unknown;
    try {
      data = await res.json();
    } catch {
      // Ein Proxy antwortet bei 401 oder 429 auch ohne JSON
      return { ok: false, error: res.ok ? 'dienst' : errorFor(res.status, null) };
    }
    if (!res.ok) return { ok: false, error: errorFor(res.status, data) };
    const reply = data as Partial<ChatReply> | null;
    if (!reply || typeof reply.reply !== 'string') return { ok: false, error: 'dienst' };
    return {
      ok: true,
      reply: {
        reply: reply.reply,
        suggestion: reply.suggestion ?? 'keine',
        guideId: reply.guideId ?? '',
        assessment: reply.assessment ?? 'keine',
      },
    };
  },
};
