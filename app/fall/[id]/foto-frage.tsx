import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { CameraCapture, type CapturedPhoto } from '@/components/app/CameraCapture';
import { CaseScreen, useCaseId } from '@/components/app/CaseScreen';
import { Typing } from '@/components/app/Conversation';
import { backToThread } from '@/components/nav/leaveCase';
import { de } from '@/i18n/de';
import { prepareChatImage } from '@/lib/chat/photo';
import { recipientParam } from '@/lib/chat/recipient';
import { useAppStore } from '@/store/appStore';

/**
 * Foto für den Reparatur-Assistenten (Entscheidung 26) oder den Händler (Entscheidung 32).
 * Nur Aufnahme in der App. Danach geht es zurück ins Gespräch, das Foto hängt am Eingabefeld und
 * bleibt bei seinem Empfänger. Nur ein Foto für den Assistenten wird für ihn vorbereitet.
 */
export default function FotoFrage() {
  const caseId = useCaseId();
  const { an: param } = useLocalSearchParams<{ an?: string }>();
  const an = recipientParam(param);
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
    // Ein Foto für den Händler kommt nie in den Speicher für den Assistenten
    if (an === 'assistent') {
      setPreparing(true);
      await prepareChatImage(photo.id, pic.uri, pic);
    }
    backToThread(caseId, undefined, photo.id, an);
  };

  return (
    <CaseScreen
      title={an === 'haendler' ? de.screens.fotoHaendler : de.screens.fotoFrage}
      scroll={false}
    >
      {preparing ? (
        <Typing label={de.chat.photoPreparing} />
      ) : (
        <CameraCapture help={de.chat.photoHelp} onCapture={capture} />
      )}
    </CaseScreen>
  );
}
