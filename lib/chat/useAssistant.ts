// Reparatur-Assistent im Fall-Gespräch: Einwilligung, Senden, Fehler.
// Eigene Worte gehen direkt an den Assistenten (Entscheidung 12). Geht das nicht,
// werden sie zur Notiz für die Fachkraft.
import { useState } from 'react';

import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';
import { services, type ChatError } from '@/services';
import { useAppStore } from '@/store/appStore';

import { chatContext, hasChatConsent, hasPhotoConsent, PHOTO_CONSENT_SINCE } from './context';
import { chatLimits } from './limits';
import { chatImage, releaseChatImage } from './photo';

/** Neue Fassung: Fotos stehen im Hinweis (Entscheidung 26) */
export const CONSENT_TEXT_VERSION = PHOTO_CONSENT_SINCE;

/** Bei diesen Fehlern lohnt ein zweiter Versuch. Sonst wird die Nachricht zur Notiz. */
export const retryableChatErrors: ChatError[] = ['ausgelastet', 'netz', 'dienst'];

export function useAssistant(caseId: string) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ChatError>();
  /** Text, der auf die Einwilligung wartet */
  const [waiting, setWaiting] = useState<{ text: string; photoId?: string }>();
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
    const mine = st.chatMessages.filter((m) => m.caseId === caseId);
    const lastPhoto = mine.at(-1)?.role === 'haushalt' ? mine.at(-1)?.photoId : undefined;
    const history = mine.map((m, i) => {
      // Ein Foto geht nur mit der letzten Nachricht mit. Ältere stehen nur als Hinweis im Text.
      const image = i === mine.length - 1 ? chatImage(m.photoId) : undefined;
      const text = m.photoId && !image ? `${de.chat.photoMarker} ${m.text}` : m.text;
      return image ? { role: m.role, text, image } : { role: m.role, text };
    });
    // Die Anfrage beginnt mit einer Nachricht des Haushalts
    const start = history.findIndex(
      (m, i) => m.role === 'haushalt' && i >= history.length - chatLimits.messages + 2,
    );
    setPending(true);
    setError(undefined);
    const result = await services.chat.ask(context, history.slice(Math.max(start, 0)));
    setPending(false);
    if (result.ok) releaseChatImage(lastPhoto);
    if (!result.ok) {
      setError(result.error);
      if (!retryableChatErrors.includes(result.error)) {
        const last = history.at(-1);
        if (last?.role === 'haushalt') toNote(last.text);
      }
      return;
    }
    const { reply, suggestion, guideId, assessment } = result.reply;
    useAppStore.getState().addChatMessage({
      caseId,
      role: 'assistent',
      text: reply,
      suggestion: suggestion === 'keine' ? undefined : suggestion,
      guideId: guideId || undefined,
      assessment: lastPhoto && assessment !== 'keine' ? assessment : undefined,
    });
  };

  const post = (text: string, photoId?: string) => {
    useAppStore.getState().addChatMessage({ caseId, role: 'haushalt', text, photoId });
    setNoted(false);
    void ask();
  };

  /** Schickt den Text, auf Wunsch mit Foto. Ohne Einwilligung wartet er, bis du zustimmst. */
  const send = (text: string, photoId?: string) => {
    const s = useAppStore.getState();
    // Ein Foto braucht die Fassung des Hinweises, in der Fotos stehen
    if (!hasChatConsent(s) || (photoId && !hasPhotoConsent(s))) {
      setWaiting({ text, photoId });
      return;
    }
    post(text, photoId);
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
    const w = waiting;
    setWaiting(undefined);
    if (w) post(w.text, w.photoId);
  };

  /** Ohne Einwilligung: Der Text geht als Notiz an die Fachkraft */
  const decline = () => {
    const w = waiting;
    setWaiting(undefined);
    if (w) toNote(w.text);
  };

  const retry = () => void ask();

  return { consent, pending, error, waiting, noted, send, accept, decline, retry };
}
