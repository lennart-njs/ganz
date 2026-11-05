import { Button, Sheet, Text, Toast } from '@/components/ds';
import { useCommand } from '@/hooks/useCommand';
import { de } from '@/i18n/de';
import { caseNames, textStamp } from '@/lib/legalTexts';
import { serviceFor } from '@/lib/service';
import { scopedConsent } from '@/model/policies/consentScopes';
import type { Id } from '@/model/types';
import { useAppStore } from '@/store/appStore';

interface CallbackSheetProps {
  caseId: Id;
  /** Gewähltes Zeitfenster. Ohne Zeitfenster ist das Sheet zu. */
  slot?: string;
  onClose: () => void;
}

/**
 * Bestätigung vor dem Rückruf. Wer welche Daten sieht, steht im Profil unter „Datenschutz“
 * (Entscheidung 38). Erst der Tap speichert die Weitergabe an die Fachkraft (lit. b) und fragt den Rückruf an (R-16).
 * Fachkraft und Betrieb sind dieselben wie im Videocall: beim Händler-Gerät sein Kundendienst
 * (Entscheidung 16), sonst die aus der Konfiguration (lib/service.ts).
 */
export function CallbackSheet({ caseId, slot, onClose }: CallbackSheetProps) {
  const t = de.waiting;
  const device = useAppStore((s) => s.devices.find((d) => d.id === s.cases[caseId]?.deviceId));
  const { expert } = serviceFor(device);
  const partner = expert.partner;

  // Bestätigung und Rückruf speichert der Store in einem Schritt. Ein Doppeltap fragt nicht doppelt.
  // Der Stempel trägt die Namen, die das Sheet zeigt.
  const send = useCommand(
    (time: string) =>
      useAppStore.getState().requestCallback(
        caseId,
        time,
        scopedConsent('weitergabe_fachkraft', {
          caseId,
          recipient: { id: partner.id, kind: 'betrieb', name: partner.name },
          text: textStamp('fachkraft_rueckruf', caseNames(useAppStore.getState(), caseId)),
        }),
      ),
    onClose,
  );
  const confirm = () => {
    if (slot) send.run(slot);
  };

  return (
    <Sheet visible={!!slot} onClose={onClose} title={t.confirmTitle(slot ?? '')}>
      <Text variant="body">{t.confirmText}</Text>
      {send.toast ? <Toast message={send.toast} /> : null}
      <Button label={t.requestCallback} fullWidth onPress={confirm} />
      <Button label={de.common.cancel} variant="secondary" fullWidth onPress={onClose} />
    </Sheet>
  );
}
