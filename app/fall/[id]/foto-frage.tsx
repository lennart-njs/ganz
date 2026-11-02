import { useState } from 'react';

import { CameraCapture, type CapturedPhoto } from '@/components/app/CameraCapture';
import { CaseScreen, useCaseId } from '@/components/app/CaseScreen';
import { Typing } from '@/components/app/Conversation';
import { backToThread } from '@/components/nav/leaveCase';
import { de } from '@/i18n/de';
import { prepareChatImage } from '@/lib/chat/photo';
import { useAppStore } from '@/store/appStore';

/**
 * Foto für den Reparatur-Assistenten (Entscheidung 26). Nur Aufnahme in der App.
 * Danach geht es zurück ins Gespräch, das Foto hängt am Eingabefeld.
 */
export default function FotoFrage() {
  const caseId = useCaseId();
  const [preparing, setPreparing] = useState(false);

  const capture = async (pic: CapturedPhoto) => {
    const s = useAppStore.getState();
    const c = s.cases[caseId];
    if (!c) return;
    const photo = s.addPhoto({
      caseId,
      deviceId: c.deviceId,
      purpose: 'frage',
      source: pic.source,
      uri: pic.uri,
      width: pic.width,
      height: pic.height,
    });
    setPreparing(true);
    await prepareChatImage(photo.id, pic.uri, pic);
    backToThread(caseId, undefined, photo.id);
  };

  return (
    <CaseScreen title={de.screens.fotoFrage} scroll={false}>
      {preparing ? (
        <Typing label={de.chat.photoPreparing} />
      ) : (
        <CameraCapture help={de.chat.photoHelp} onCapture={capture} />
      )}
    </CaseScreen>
  );
}
