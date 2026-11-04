// Was App und Chat-Route über HTTP austauschen: Pfad und Header. Beide Seiten lesen diese Werte.

/** Pfad der Route. Die App stellt EXPO_PUBLIC_API_URL davor, sonst gilt er relativ zum Dev-Server. */
export const CHAT_PATH = '/api/chat';

export const CHAT_HEADERS = {
  /** Pitch-Token aus EXPO_PUBLIC_CHAT_TOKEN. Die Route prüft ihn, wenn CHAT_PITCH_TOKEN gesetzt ist. */
  token: 'X-Ganz-Token',
  /** Zufällige Kennung dieser Installation, nur für das Rate-Limit */
  installation: 'X-Ganz-Installation',
} as const;

/** Form der Installations-ID. Eine andere lehnt die Route mit 400 ab. */
export const INSTALLATION_ID = /^[A-Za-z0-9-]{8,64}$/;
