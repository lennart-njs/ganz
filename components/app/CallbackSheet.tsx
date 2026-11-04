import { StyleSheet } from 'react-native';

import { ScopeItems } from '@/components/app/ScopeItems';
import { Button, Card, Sheet, Text, Toast } from '@/components/ds';
import { demoConfig } from '@/config/demo.config';
import { useCommand } from '@/hooks/useCommand';
import { de } from '@/i18n/de';
import { textStamp } from '@/lib/legalTexts';
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
 * Bestätigung vor dem Rückruf: wer welche Daten sieht, wie vor dem Videocall (B-19, B-23).
 * Erst der Tap speichert die Weitergabe an die Fachkraft (lit. b) und fragt den Rückruf an (R-16).
 */
export function CallbackSheet({ caseId, slot, onClose }: CallbackSheetProps) {
  const t = de.waiting;
  const expert = demoConfig.expert.name;
  const partner = demoConfig.partners.find((p) => p.id === demoConfig.expert.partnerId)!;

  // Bestätigung und Rückruf speichert der Store in einem Schritt. Ein Doppeltap fragt nicht doppelt.
  const send = useCommand(
    (time: string) =>
      useAppStore.getState().requestCallback(
        caseId,
        time,
        scopedConsent('weitergabe_fachkraft', {
          caseId,
          recipient: { id: partner.id, kind: 'betrieb', name: partner.name },
          text: textStamp('fachkraft_rueckruf'),
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
      <Card>
        <Text variant="labelStrong" accessibilityRole="header">
          {de.help.shareTitle(expert, partner.name)}
        </Text>
        <ScopeItems purpose="weitergabe_fachkraft" />
        <Text variant="meta" style={styles.gapTop}>
          {de.help.legalBasis}
        </Text>
      </Card>
      {send.toast ? <Toast message={send.toast} /> : null}
      <Button label={t.requestCallback} fullWidth onPress={confirm} />
      <Button label={de.common.cancel} variant="secondary" fullWidth onPress={onClose} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  gapTop: { marginTop: 8 },
});
