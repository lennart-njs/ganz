import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, ChoiceChip, Sheet, Text } from '@/components/ds';
import { de } from '@/i18n/de';
import { useAppStore } from '@/store/appStore';

import { leaveCase } from './leaveCase';

interface CloseCaseSheetProps {
  caseId?: string;
  visible: boolean;
  onClose: () => void;
}

/** X im Fall: später weitermachen oder abbrechen mit Grund (B-04). */
export function CloseCaseSheet({ caseId, visible, onClose }: CloseCaseSheetProps) {
  const t = de.closeCase;
  const exists = useAppStore((s) => (caseId ? !!s.cases[caseId] : false));
  const pauseCase = useAppStore((s) => s.pauseCase);
  const runCommand = useAppStore((s) => s.runCommand);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState<string | null>(null);

  const close = () => {
    setCancelling(false);
    setReason(null);
    onClose();
  };

  const later = () => {
    if (caseId && exists) pauseCase(caseId);
    close();
    leaveCase();
  };

  const cancel = () => {
    if (caseId && exists && reason) runCommand(caseId, 'abbrechen', { cancelReason: reason });
    close();
    leaveCase();
  };

  return (
    <Sheet visible={visible} onClose={close} title={cancelling ? t.reasonTitle : t.title}>
      {cancelling ? (
        <>
          <View style={styles.chips} accessibilityRole="radiogroup">
            {t.reasons.map((r) => (
              <ChoiceChip key={r} label={r} selected={reason === r} onPress={() => setReason(r)} />
            ))}
          </View>
          <Button
            label={t.confirmCancel}
            variant="danger"
            fullWidth
            disabled={!reason}
            onPress={cancel}
          />
          <Button label={t.keep} variant="secondary" fullWidth onPress={close} />
        </>
      ) : (
        <>
          <Text variant="body">{t.text}</Text>
          <Button label={t.later} fullWidth onPress={later} />
          <Button
            label={t.cancel}
            variant="secondary"
            fullWidth
            onPress={() => setCancelling(true)}
          />
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
