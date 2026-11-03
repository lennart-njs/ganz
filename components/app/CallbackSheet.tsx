import { StyleSheet, View } from 'react-native';

import { Button, Card, Sheet, Text } from '@/components/ds';
import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';
import type { Id } from '@/model/types';
import { useAppStore } from '@/store/appStore';

/** Version des Hinweistexts vor dem Rückruf, wie vor dem Videocall */
const CONSENT_TEXT_VERSION = '2026-10-1';

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

  // Bestätigung und Rückruf speichert der Store in einem Schritt
  const confirm = () => {
    if (!slot) return;
    useAppStore.getState().requestCallback(caseId, slot, {
      caseId,
      purpose: 'weitergabe_fachkraft',
      legalBasis: 'vertrag',
      recipient: { id: partner.id, kind: 'betrieb', name: partner.name },
      dataCategories: [...de.help.shareItems],
      textVersion: CONSENT_TEXT_VERSION,
    });
    onClose();
  };

  return (
    <Sheet visible={!!slot} onClose={onClose} title={t.confirmTitle(slot ?? '')}>
      <Text variant="body">{t.confirmText}</Text>
      <Card>
        <Text variant="labelStrong" accessibilityRole="header">
          {de.help.shareTitle(expert, partner.name)}
        </Text>
        <View style={styles.items}>
          {de.help.shareItems.map((item) => (
            <Text key={item} variant="body">
              {de.help.item(item)}
            </Text>
          ))}
        </View>
        <Text variant="meta" style={styles.gapTop}>
          {de.help.legalBasis}
        </Text>
      </Card>
      <Button label={t.requestCallback} fullWidth onPress={confirm} />
      <Button label={de.common.cancel} variant="secondary" fullWidth onPress={onClose} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  items: { marginTop: 8, gap: 2 },
  gapTop: { marginTop: 8 },
});
