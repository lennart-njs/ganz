import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, ChoiceChip, Sheet, Text, Toast } from '@/components/ds';
import { useCommand } from '@/hooks/useCommand';
import { de } from '@/i18n/de';
import { can } from '@/model/policies/actions';
import { selectCaseFacts } from '@/model/policies/caseFacts';
import { useAppStore } from '@/store/appStore';

import { leaveCase } from './leaveCase';

interface CloseCaseSheetProps {
  caseId?: string;
  visible: boolean;
  onClose: () => void;
  /** Gleich mit dem Grund fürs Abbrechen beginnen, z. B. im Gespräch nach einem Widerruf */
  startCancelling?: boolean;
}

/**
 * X im Fall: später weitermachen oder abbrechen mit Grund (B-04). Beides nur, wo die Regeln es
 * erlauben (R-01), Abbrechen seit Nr. 34 auch in der Reparatur. Läuft ein Termin, steht vor dem
 * Abbrechen, dass der Betrieb die Absage bekommt. Hat er den Auftrag schon, steht dabei, dass er
 * mit dir klärt, ob Kosten entstanden sind. ganz sagt nie zu, dass es nichts kostet (§ 648 BGB).
 * Ein abgeschlossener Fall führt nur noch zur Übersicht. Ohne Fall bleibt nur
 * „Später weitermachen“, das dann nur den Fall verlässt.
 */
export function CloseCaseSheet({
  caseId,
  visible,
  onClose,
  startCancelling = false,
}: CloseCaseSheetProps) {
  const t = de.closeCase;
  const exists = useAppStore((s) => (caseId ? !!s.cases[caseId] : false));
  const canPause = useAppStore((s) =>
    caseId ? can(selectCaseFacts(s, caseId), 'pausieren') : false,
  );
  const canCancel = useAppStore((s) =>
    caseId ? can(selectCaseFacts(s, caseId), 'abbrechen') : false,
  );
  // Der Betrieb des laufenden Termins, und ob er den Auftrag schon hat (caseFacts.order)
  const partner = useAppStore((s) => {
    const f = caseId ? selectCaseFacts(s, caseId) : undefined;
    return f?.bookingOpen ? f.booking?.provider.name : undefined;
  });
  const ordered = useAppStore((s) => (caseId ? !!selectCaseFacts(s, caseId)?.order : false));
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

  // Abbrechen zählt einmal. Lehnt der Store ab, bleibt das Sheet mit einem ruhigen Satz offen.
  const abort = useCommand(
    (id: string, cancelReason: string) => runCommand(id, 'abbrechen', { cancelReason }),
    () => {
      close();
      leaveCase();
    },
  );
  const cancel = () => {
    if (caseId && canCancel && reason) abort.run(caseId, reason);
  };

  const reasons = (cancelling || startCancelling) && canCancel;

  return (
    <Sheet visible={visible} onClose={close} title={reasons ? t.reasonTitle : t.title}>
      {abort.toast ? <Toast message={abort.toast} /> : null}
      {reasons ? (
        <>
          {partner ? <Text variant="body">{t.partnerNotice(partner)}</Text> : null}
          {partner && ordered ? <Text variant="body">{t.costsOpen(partner)}</Text> : null}
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
