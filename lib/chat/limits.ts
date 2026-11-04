/**
 * Grenzen für ein Gespräch mit dem Reparatur-Assistenten. App und Server prüfen dieselben Werte.
 * messages: Nachrichten je Gespräch, chars: Zeichen je Nachricht, field: Zeichen je Feld im Kontext,
 * imageChars: base64-Zeichen eines Fotos (5 MB-Grenze der API, mit Abstand).
 */
export const chatLimits = { messages: 40, chars: 1200, field: 200, imageChars: 5_000_000 } as const;

/**
 * Größte Anfrage in Bytes: ein Foto, volle Nachrichten (UTF-8 und JSON-Escapes großzügig gerechnet)
 * und der Kontext. Die Route lehnt größere ab, bevor sie den Body liest.
 */
export const chatMaxBodyBytes =
  chatLimits.imageChars + chatLimits.messages * chatLimits.chars * 6 + 64_000;

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
