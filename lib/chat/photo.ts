// Fotos für den Reparatur-Assistenten (Entscheidung 26).
// Das Bild wird verkleinert und nur für die nächste Anfrage im Speicher gehalten.
// Es landet nicht im gespeicherten Zustand und der Server speichert es nicht.
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import type { ChatImage } from './prompt';

/** Längste Kante. Claude rechnet größere Bilder ohnehin herunter. */
const MAX_EDGE = 1280;

const pending = new Map<string, ChatImage>();

/** Verkleinert ein Foto und hält es für die Anfrage bereit. Ohne Bild (Beispielfoto): undefined. */
export async function prepareChatImage(
  photoId: string,
  uri: string,
  size?: { width?: number; height?: number },
): Promise<ChatImage | undefined> {
  if (!uri) return undefined;
  try {
    const ctx = ImageManipulator.manipulate(uri);
    const landscape = (size?.width ?? 0) >= (size?.height ?? 0);
    ctx.resize(landscape ? { width: MAX_EDGE } : { height: MAX_EDGE });
    const image = await ctx.renderAsync();
    const result = await image.saveAsync({ base64: true, compress: 0.7, format: SaveFormat.JPEG });
    if (!result.base64) return undefined;
    const prepared: ChatImage = { mediaType: 'image/jpeg', data: result.base64 };
    pending.set(photoId, prepared);
    return prepared;
  } catch {
    return undefined;
  }
}

/** Das Bild zu einer Nachricht, solange es im Speicher liegt */
export function chatImage(photoId: string | undefined): ChatImage | undefined {
  return photoId ? pending.get(photoId) : undefined;
}

/** Nach der Antwort wird das Bild nicht mehr gebraucht */
export function releaseChatImage(photoId: string | undefined) {
  if (photoId) pending.delete(photoId);
}

/** Nur für Tests */
export function setChatImageForTest(photoId: string, image: ChatImage) {
  pending.set(photoId, image);
}
