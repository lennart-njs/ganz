// Wer bekommt, was im Eingabefeld des Fall-Gesprächs steht: der Reparatur-Assistent oder der
// Händler (Entscheidung 32). Ohne aktive Weitergabe an den Händler immer der Assistent.
// Ist das Gespräch mit dem Assistenten voll (R-11), bleibt nur der Händler, wenn es ihn gibt.

export type ChatRecipient = 'assistent' | 'haendler';

export interface RecipientInput {
  /** Der Fall ist an den Händler gegeben und nicht widerrufen */
  dealerShared: boolean;
  /** Für eine weitere Frage an den Assistenten ist kein Platz (useAssistant().full) */
  assistantFull: boolean;
  /** Was der Haushalt im Umschalter gewählt hat */
  pick?: ChatRecipient;
  /** Der Händler hat nach der letzten Nachricht an den Assistenten geschrieben */
  dealerSpokeLast: boolean;
}

/** Empfänger der nächsten Nachricht. Ohne eigene Wahl bekommt die Antwort, wer zuletzt sprach. */
export function chatRecipient(o: RecipientInput): ChatRecipient {
  if (!o.dealerShared) return 'assistent';
  if (o.assistantFull) return 'haendler';
  return o.pick ?? (o.dealerSpokeLast ? 'haendler' : 'assistent');
}

/** Gibt es überhaupt ein Eingabefeld? Ohne Händler und mit vollem Gespräch nicht (R-11). */
export function chatInputOpen(o: Pick<RecipientInput, 'dealerShared' | 'assistantFull'>): boolean {
  return o.dealerShared || !o.assistantFull;
}
