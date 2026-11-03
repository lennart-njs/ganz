// Reparatur-Assistent im Fall-Gespräch: Einwilligung, Senden, Fehler, Grenze.
// Eigene Worte gehen direkt an den Assistenten (Entscheidung 12). Geht das nicht,
// werden sie zur Notiz für die Fachkraft. Ohne Netz entscheidest du: noch einmal senden oder
// als Notiz speichern. Nach chatLimits.messages Nachrichten ist Senden aus,
// dann hilft die Fachkraft weiter (R-11).
import { useState } from 'react';

import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';
import { textStamp } from '@/lib/legalTexts';
import { scopedConsent } from '@/model/policies/consentScopes';
import { services, type ChatError } from '@/services';
import { useAppStore } from '@/store/appStore';

import { chatContext, hasChatConsent } from './context';
import { chatFull, fitsRequest } from './limits';

/** Bei diesen Fehlern lohnt ein zweiter Versuch. Sonst wird die Nachricht zur Notiz. */
export const retryableChatErrors: ChatError[] = ['ausgelastet', 'zu_viele', 'netz', 'dienst'];

/** Fehler, die das Gespräch als Hinweis zeigt. Ein volles Gespräch zeigt full statt eines Fehlers. */
export type AssistantError = Exclude<ChatError, 'voll'>;

/** Nachrichten im Gespräch eines Falls, in der Reihenfolge, in der sie kamen */
const historyOf = (caseId: string) =>
  useAppStore
    .getState()
    .chatMessages.filter((m) => m.caseId === caseId)
    .map((m) => ({ role: m.role, text: m.text }));

export function useAssistant(caseId: string) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<AssistantError>();
  /** Text, der auf die Einwilligung wartet */
  const [waiting, setWaiting] = useState<string>();
  const [noted, setNoted] = useState(false);

  const consent = useAppStore(hasChatConsent);
  const count = useAppStore((s) => s.chatMessages.filter((m) => m.caseId === caseId).length);
  /** Die Route meldet ein volles Gespräch, auch wenn die App es anders zählt */
  const [serverFull, setServerFull] = useState(false);
  /** Für eine weitere Frage samt Antwort ist kein Platz: Senden ist aus (R-11) */
  const full = chatFull(count) || serverFull;

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
    const context = chatContext(useAppStore.getState(), caseId);
    if (!context) return;
    // Das ganze Gespräch geht mit, kein Fenster über den Verlauf. Passt die Antwort nicht mehr
    // hinein, geht nichts raus (R-11).
    const history = historyOf(caseId);
    if (!fitsRequest(history.length)) return;
    setPending(true);
    setError(undefined);
    const result = await services.chat.ask(context, history);
    setPending(false);
    if (!result.ok) {
      const last = history.at(-1);
      if (result.error === 'voll') {
        setServerFull(true);
        if (last?.role === 'haushalt') toNote(last.text);
        return;
      }
      setError(result.error);
      if (!retryableChatErrors.includes(result.error) && last?.role === 'haushalt') {
        toNote(last.text);
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

  /** Schickt den Text. Ohne Einwilligung wartet er, bis du zustimmst. Ist das Gespräch voll, nicht. */
  const send = (text: string) => {
    if (chatFull(historyOf(caseId).length) || serverFull) return;
    if (!hasChatConsent(useAppStore.getState())) {
      setWaiting(text);
      return;
    }
    post(text);
  };

  const accept = () => {
    // Ohne Fall: Die Einwilligung gilt für jedes Gespräch. Die Fallakte zeigt die Weitergabe in
    // jedem Fall, aus dem Nachrichten gingen (R-15).
    useAppStore.getState().grantConsent(
      scopedConsent('chat_assistent', {
        recipient: {
          id: demoConfig.assistant.id,
          kind: 'dienstleister',
          name: demoConfig.assistant.name,
        },
        text: textStamp('assistent_einwilligung'),
      }),
    );
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

  /** Ohne Netz: Die letzte eigene Nachricht wird zur Notiz für die Fachkraft, nur einmal */
  const saveNote = () => {
    const last = historyOf(caseId).at(-1);
    if (!noted && last?.role === 'haushalt') toNote(last.text);
  };

  return {
    consent,
    pending,
    error,
    waiting,
    noted,
    full,
    send,
    accept,
    decline,
    retry,
    saveNote,
  };
}
