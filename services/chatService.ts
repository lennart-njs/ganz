// Reparatur-Assistent: Die App fragt den eigenen Server (app/api/chat+api.ts), nie Claude direkt.
// In der Entwicklung löst Expo den relativen Pfad gegen den Dev-Server auf.
import type { ChatContext, ChatReply, ChatTurn } from '@/lib/chat/prompt';

export type ChatError =
  'kein_schluessel' | 'schluessel' | 'abgelehnt' | 'ausgelastet' | 'netz' | 'dienst';

export type ChatResult = { ok: true; reply: ChatReply } | { ok: false; error: ChatError };

export interface ChatService {
  ask(context: ChatContext, messages: ChatTurn[]): Promise<ChatResult>;
}

const known: ChatError[] = ['kein_schluessel', 'schluessel', 'abgelehnt', 'ausgelastet'];

export const httpChatService: ChatService = {
  async ask(context, messages) {
    let res: Response;
    try {
      res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context, messages }),
      });
    } catch {
      return { ok: false, error: 'netz' };
    }
    let data: unknown;
    try {
      data = await res.json();
    } catch {
      return { ok: false, error: 'dienst' };
    }
    if (!res.ok) {
      const error = (data as { error?: string } | null)?.error as ChatError | undefined;
      return { ok: false, error: error && known.includes(error) ? error : 'dienst' };
    }
    const reply = data as Partial<ChatReply> | null;
    if (!reply || typeof reply.reply !== 'string') return { ok: false, error: 'dienst' };
    return {
      ok: true,
      reply: {
        reply: reply.reply,
        suggestion: reply.suggestion ?? 'keine',
        guideId: reply.guideId ?? '',
      },
    };
  },
};
