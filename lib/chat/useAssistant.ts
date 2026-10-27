// Reparatur-Assistent im Fall-Gespräch: Einwilligung, Senden, Fehler.
// Eigene Worte gehen direkt an den Assistenten (Entscheidung 12). Geht das nicht,
// werden sie zur Notiz für die Fachkraft.
import { useState } from 'react';

import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';
import { services, type ChatError } from '@/services';
import { useAppStore } from '@/store/appStore';

import { chatContext, hasChatConsent } from './context';
import { chatLimits } from './limits';

const CONSENT_TEXT_VERSION = '2026-10-1';

/** Bei diesen Fehlern lohnt ein zweiter Versuch. Sonst wird die Nachricht zur Notiz. */
export const retryableChatErrors: ChatError[] = ['ausgelastet', 'netz', 'dienst'];

export function useAssistant(caseId: string) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ChatError>();
  /** Text, der auf die Einwilligung wartet */
  const [waiting, setWaiting] = useState<string>();
  const [noted, setNoted] = useState(false);

  const consent = useAppStore(hasChatConsent);

  /** Nachricht als Notiz für die Fachkraft, wenn der Assistent nicht antworten kann */
  const toNote = (text: string) => {
    const s = useAppStore.getState();
    s.addEvent({
      caseId,
      type: 'rueckfrage_beantwortet',
      actor: { kind: 'haushalt', id: s.persons[0]?.id },
      payload: { question: de.thread.noteQuestion, answer: text },
    });
    setNoted(true);
  };

  const ask = async () => {
    const st = useAppStore.getState();
    const context = chatContext(st, caseId);
    if (!context) return;
    const history = st.chatMessages
      .filter((m) => m.caseId === caseId)
      .map((m) => ({ role: m.role, text: m.text }));
    // Die Anfrage beginnt mit einer Nachricht des Haushalts
    const start = history.findIndex(
      (m, i) => m.role === 'haushalt' && i >= history.length - chatLimits.messages + 2,
    );
    setPending(true);
    setError(undefined);
    const result = await services.chat.ask(context, history.slice(Math.max(start, 0)));
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      if (!retryableChatErrors.includes(result.error)) {
        const last = history.at(-1);
        if (last?.role === 'haushalt') toNote(last.text);
      }
      return;
    }
    const { reply, suggestion, guideId } = result.reply;
    useAppStore.getState().addChatMessage({
      caseId,
      role: 'assistent',
      text: reply,
      suggestion: suggestion === 'keine' ? undefined : suggestion,
      guideId: guideId || undefined,
    });
  };

  const post = (text: string) => {
    useAppStore.getState().addChatMessage({ caseId, role: 'haushalt', text });
    setNoted(false);
    void ask();
  };

  /** Schickt den Text. Ohne Einwilligung wartet er, bis du zustimmst. */
  const send = (text: string) => {
    if (!hasChatConsent(useAppStore.getState())) {
      setWaiting(text);
      return;
    }
    post(text);
  };

  const accept = () => {
    useAppStore.getState().grantConsent({
      caseId,
      purpose: 'chat_assistent',
      legalBasis: 'einwilligung',
      recipient: {
        id: demoConfig.assistant.id,
        kind: 'dienstleister',
        name: demoConfig.assistant.name,
      },
      dataCategories: [...de.consentData.assistent],
      textVersion: CONSENT_TEXT_VERSION,
    });
    const text = waiting;
    setWaiting(undefined);
    if (text) post(text);
  };

  /** Ohne Einwilligung: Der Text geht als Notiz an die Fachkraft */
  const decline = () => {
    const text = waiting;
    setWaiting(undefined);
    if (text) toNote(text);
  };

  const retry = () => void ask();

  return { consent, pending, error, waiting, noted, send, accept, decline, retry };
}
