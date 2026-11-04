// Wer bekommt, was im Eingabefeld des Fall-Gesprächs steht: der Reparatur-Assistent oder der
// Händler (Entscheidung 32). Ohne aktive Weitergabe an den Händler immer der Assistent.
// Ist das Gespräch mit dem Assistenten voll (R-11), bleibt nur der Händler, wenn es ihn gibt.
// Ein angehängtes Foto bleibt bei dem Empfänger, für den es aufgenommen wurde (Übertragung 1.1).

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
  /** Für wen das angehängte Foto aufgenommen wurde. Solange es hängt, bleibt der Empfänger. */
  photoFor?: ChatRecipient;
}

/** Ein Foto am Eingabefeld und für wen es ist */
export interface AttachedPhoto {
  id: string;
  an: ChatRecipient;
}

/**
 * Empfänger der nächsten Nachricht. Mit angehängtem Foto der Empfänger des Fotos. Ohne eigene Wahl
 * bekommt die Antwort, wer zuletzt sprach.
 */
export function chatRecipient(o: RecipientInput): ChatRecipient {
  if (!o.dealerShared) return 'assistent';
  if (o.assistantFull) return 'haendler';
  return o.photoFor ?? o.pick ?? (o.dealerSpokeLast ? 'haendler' : 'assistent');
}

/** Gibt es überhaupt ein Eingabefeld? Ohne Händler und mit vollem Gespräch nicht (R-11). */
export function chatInputOpen(o: Pick<RecipientInput, 'dealerShared' | 'assistantFull'>): boolean {
  return o.dealerShared || !o.assistantFull;
}

/**
 * Ist dieser Empfänger im Umschalter wählbar? Der Assistent nicht bei vollem Gespräch (R-11).
 * Hängt ein Foto am Feld, nur der Empfänger des Fotos.
 */
export function recipientSelectable(
  o: Pick<RecipientInput, 'assistantFull' | 'photoFor'>,
  r: ChatRecipient,
): boolean {
  if (r === 'assistent' && o.assistantFull) return false;
  return !o.photoFor || o.photoFor === r;
}

/**
 * Das Foto, das mit der Nachricht an diesen Empfänger geht. Nur eins, das für ihn aufgenommen
 * wurde: ein Foto für den Händler nie an den Assistenten, eins für den Assistenten nie an den
 * Händler. Passt der Empfänger nicht mehr (Weitergabe widerrufen, Gespräch voll), bleibt es hier.
 */
export function photoForRecipient(
  photo: AttachedPhoto | undefined,
  recipient: ChatRecipient,
): AttachedPhoto | undefined {
  return photo?.an === recipient ? photo : undefined;
}

/** Empfänger aus dem Parameter `an` der Foto-Aufnahme. Ohne Angabe der Assistent. */
export function recipientParam(an: string | string[] | undefined): ChatRecipient {
  return an === 'haendler' ? 'haendler' : 'assistent';
}
