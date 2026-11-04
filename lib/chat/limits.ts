/**
 * Grenzen für ein Gespräch mit dem Reparatur-Assistenten. App und Server prüfen dieselben Werte.
 * messages: Nachrichten je Gespräch, chars: Zeichen je Nachricht, field: Zeichen je Feld im Kontext.
 */
export const chatLimits = { messages: 40, chars: 1200, field: 200 } as const;

/**
 * Lässt eine Anfrage mit so vielen Nachrichten noch Platz für die Antwort? Ein Gespräch hat
 * höchstens chatLimits.messages Nachrichten, die Antwort mitgezählt (R-11). Die Route prüft das.
 */
export function fitsRequest(messages: number): boolean {
  return messages + 1 <= chatLimits.messages;
}

/**
 * Das Gespräch ist voll: Für eine weitere Frage samt Antwort ist kein Platz. Dann ist Senden aus,
 * und das Gespräch verweist auf die Fachkraft (R-11). Die App prüft das vor jedem Senden.
 */
export function chatFull(messages: number): boolean {
  return !fitsRequest(messages + 1);
}
