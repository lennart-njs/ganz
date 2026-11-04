// Notiz an die Fachkraft: Kann der Reparatur-Assistent nicht antworten, wird deine Nachricht zur
// Notiz (lib/chat/useAssistant.ts). Sie gehört zum Gespräch mit dem Assistenten und darum nicht in
// die Akte für den Händler (docs/BACKEND.md: „Nicht in der Akte“).
import { de } from '@/i18n/de';
import type { CaseEvent } from '@/model/types';

/** Merkmal am Ereignis: Die Notiz kommt aus dem Gespräch mit dem Assistenten */
export const ASSISTANT_NOTE_SOURCE = 'assistent';

/** Inhalt des Ereignisses `rueckfrage_beantwortet` für eine Notiz an die Fachkraft */
export function assistantNotePayload(text: string) {
  return { question: de.thread.noteQuestion, answer: text, source: ASSISTANT_NOTE_SOURCE };
}

/**
 * Ist das Ereignis eine Notiz aus dem Gespräch mit dem Assistenten? Notizen, die vor dem Merkmal
 * gespeichert wurden, erkennt die Frage.
 */
export function isAssistantNote(e: CaseEvent): boolean {
  return (
    e.type === 'rueckfrage_beantwortet' &&
    (e.payload.source === ASSISTANT_NOTE_SOURCE || e.payload.question === de.thread.noteQuestion)
  );
}
