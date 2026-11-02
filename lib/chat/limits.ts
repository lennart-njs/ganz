/** Grenzen für ein Gespräch mit dem Reparatur-Assistenten. App und Server prüfen dieselben Werte. */
export const chatLimits = {
  messages: 40,
  chars: 1200,
  /** base64-Zeichen eines Fotos (5 MB-Grenze der API, mit Abstand) */
  imageChars: 5_000_000,
} as const;
