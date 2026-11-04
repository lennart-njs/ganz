// Beschriftung der Fotos in der Fallakte. Ein Foto zu einer Nachricht der Kundschaft heißt so und
// nicht nach seinem Zweck in der App. Dort ist es ein Foto zu einer Frage, und das hieße hier
// „Frage an den Assistenten“ (Prüfung 1.1). Fotos für den Assistenten kommen nie in die Akte.
import { de } from '@/i18n/de';
import type { SharedCaseFile, SharedPhoto } from '@/model/sharing';

export function photoLabel(file: Pick<SharedCaseFile, 'messages'>, p: SharedPhoto): string {
  const withMessage = (file.messages ?? []).some((m) => m.photoId === p.id);
  if (withMessage || p.purpose === 'frage') return de.portal.file.photoMessage;
  return de.caseFile.photoPurpose[p.purpose] ?? p.purpose;
}
