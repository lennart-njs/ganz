import { router } from 'expo-router';
import { useState } from 'react';

import { DemoHint } from '@/components/app/DemoHint';
import { CameraCapture, type CapturedPhoto } from '@/components/app/CameraCapture';
import { CaseScreen, useCaseId } from '@/components/app/CaseScreen';
import { SegmentedControl } from '@/components/ds';
import { de } from '@/i18n/de';
import { caseAppliance } from '@/lib/appliance';
import type { PhotoMode } from '@/services';
import { useAppStore } from '@/store/appStore';

const modes: PhotoMode[] = ['display', 'typenschild', 'bauteil'];

/** Foto machen: Modus wählen, Auslöser. Nur Aufnahme in der App, kein Import aus der Galerie. */
export default function Kamera() {
  const caseId = useCaseId();
  const [mode, setMode] = useState<PhotoMode>('display');
  const typePlate = useAppStore((s) => caseAppliance(s, caseId).typePlate);

  const capture = (pic: CapturedPhoto) => {
    const s = useAppStore.getState();
    const c = s.cases[caseId];
    if (!c) return;
    const photo = s.addPhoto({
      caseId,
      deviceId: c.deviceId,
      purpose: mode,
      source: pic.source,
      uri: pic.uri,
      width: pic.width,
      height: pic.height,
    });
    router.push(`/fall/${caseId}/analyse?foto=${photo.id}&modus=${mode}`);
  };

  return (
    <CaseScreen title={de.screens.kamera} scroll={false}>
      <DemoHint id="kamera" />
      <CameraCapture
        help={mode === 'typenschild' ? typePlate : de.camera.help[mode]}
        onCapture={capture}
        top={
          <SegmentedControl
            tone="inverse"
            accessibilityLabel={de.camera.modesLabel}
            options={modes.map((m) => ({ value: m, label: de.camera.modes[m] }))}
            value={mode}
            onChange={setMode}
          />
        }
      />
    </CaseScreen>
  );
}
