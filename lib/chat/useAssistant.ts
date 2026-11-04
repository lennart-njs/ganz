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
import type { ChatMessage } from '@/model/types';
import { services, type ChatError } from '@/services';
import { useAppStore } from '@/store/appStore';

import { chatContext, hasChatConsent } from './context';
import { chatFull, fitsRequest } from './limits';

/** Bei diesen Fehlern lohnt ein zweiter Versuch. Sonst wird die Nachricht zur Notiz. */
export const retryableChatErrors: ChatError[] = ['ausgelastet', 'zu_viele', 'netz', 'dienst'];

/**
 * Bei diesen Fehlern kam die Anfrage nicht beim Anbieter an: ohne Netz, oder die eigene Route
 * lehnte vorher ab. Bei allen anderen Fehlern kann sie dort gewesen sein, dann zählt sie in der
 * Fallakte als weitergegeben.
 */
export const unforwardedChatErrors: ChatError[] = [
  'netz',
  'kein_schluessel',
  'token',
  'zu_viele',
  'tagesgrenze',
  'voll',
];

/** Fehler, die das Gespräch als Hinweis zeigt. Ein volles Gespräch zeigt full statt eines Fehlers. */
export type AssistantError = Exclude<ChatError, 'voll'>;

/** Nachrichten im Gespräch eines Falls, in der Reihenfolge, in der sie kamen */
const messagesOf = (caseId: string) =>
  useAppStore.getState().chatMessages.filter((m) => m.caseId === caseId);

const historyOf = (caseId: string) =>
  messagesOf(caseId).map((m) => ({ role: m.role, text: m.text }));

/**
 * Hält nach einer Anfrage fest, ob die eigenen Nachrichten beim Anbieter ankamen. Kam sie nicht
 * an, betrifft das nur die Nachrichten nach der letzten Antwort. Was davor stand, hatte schon eine
 * Antwort und ging also weiter.
 */
function markForwarded(sent: readonly ChatMessage[], forwarded: boolean) {
  const lastReply = sent.findLastIndex((m) => m.role === 'assistent');
  const mine = (forwarded ? sent : sent.slice(lastReply + 1)).filter((m) => m.role === 'haushalt');
  if (mine.length > 0)
    useAppStore.getState().markChatForwarded(
      mine.map((m) => m.id),
      forwarded,
    );
}

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
    // Die einzige Stelle, an der etwas den Anbieter erreicht. Ohne Einwilligung geht nichts raus,
    // auch nicht mit „Noch einmal senden“ nach einem Widerruf. Dann bleibt auch die
    // Installations-ID gelöscht (services/chatService.ts legt sie erst beim Senden an).
    if (!hasChatConsent(useAppStore.getState())) {
      setError(undefined);
      return;
    }
    const context = chatContext(useAppStore.getState(), caseId);
    if (!context) return;
    // Das ganze Gespräch geht mit, kein Fenster über den Verlauf. Passt die Antwort nicht mehr
    // hinein, geht nichts raus (R-11).
    const sent = messagesOf(caseId);
    const history = sent.map((m) => ({ role: m.role, text: m.text }));
    if (!fitsRequest(history.length)) return;
    setPending(true);
    setError(undefined);
    const result = await services.chat.ask(context, history);
    setPending(false);
    markForwarded(sent, result.ok || !unforwardedChatErrors.includes(result.error));
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
