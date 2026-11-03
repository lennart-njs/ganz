import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, ChoiceChip, Sheet, Text } from '@/components/ds';
import { de } from '@/i18n/de';
import { can } from '@/model/policies/actions';
import { selectCaseFacts } from '@/model/policies/caseFacts';
import { useAppStore } from '@/store/appStore';

import { leaveCase } from './leaveCase';

interface CloseCaseSheetProps {
  caseId?: string;
  visible: boolean;
  onClose: () => void;
}

/**
 * X im Fall: später weitermachen oder abbrechen mit Grund (B-04). Beides nur, wo die Regeln es
 * erlauben (R-01). Ein abgeschlossener Fall führt nur noch zur Übersicht. Ohne Fall bleibt nur
 * „Später weitermachen“, das dann nur den Fall verlässt.
 */
export function CloseCaseSheet({ caseId, visible, onClose }: CloseCaseSheetProps) {
  const t = de.closeCase;
  const exists = useAppStore((s) => (caseId ? !!s.cases[caseId] : false));
  const canPause = useAppStore((s) =>
    caseId ? can(selectCaseFacts(s, caseId), 'pausieren') : false,
  );
  const canCancel = useAppStore((s) =>
    caseId ? can(selectCaseFacts(s, caseId), 'abbrechen') : false,
  );
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
    if (caseId && canPause) pauseCase(caseId);
    close();
    leaveCase();
  };

  const leave = () => {
    close();
    leaveCase();
  };

  const cancel = () => {
    if (caseId && canCancel && reason) runCommand(caseId, 'abbrechen', { cancelReason: reason });
    close();
    leaveCase();
  };

  return (
    <Sheet
      visible={visible}
      onClose={close}
      title={cancelling && canCancel ? t.reasonTitle : t.title}
    >
      {cancelling && canCancel ? (
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
      ) : canPause || !exists ? (
        <>
          <Text variant="body">{t.text}</Text>
          <Button label={t.later} fullWidth onPress={later} />
          {canCancel ? (
            <Button
              label={t.cancel}
              variant="secondary"
              fullWidth
              onPress={() => setCancelling(true)}
            />
          ) : exists ? (
            <Text variant="meta">{t.noCancel}</Text>
          ) : null}
        </>
      ) : (
        <>
          <Text variant="body">{t.closedText}</Text>
          <Button label={t.leave} fullWidth onPress={leave} />
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
