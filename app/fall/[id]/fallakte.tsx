import { StyleSheet, View } from 'react-native';

import { CaseFileCard } from '@/components/app/CaseFileCard';
import { CaseScreen, useCaseId } from '@/components/app/CaseScreen';
import { Card, Text, Timeline } from '@/components/ds';
import { de } from '@/i18n/de';
import { formatDateTime } from '@/i18n/format';
import { eventLabel } from '@/lib/caseEvents';
import { caseStatusLabel } from '@/lib/caseView';
import { deviceTitle } from '@/lib/devices';
import { selectCaseEvents, useAppStore } from '@/store/appStore';

const t = de.file;

/** Fallakte: alle Ereignisse, Fotos, Befund, Kosten und Weitergaben. Quelle: CaseEvent. */
export default function Fallakte() {
  const caseId = useCaseId();
  const state = useAppStore();
  const c = state.cases[caseId];
  if (!c) {
    return (
      <CaseScreen title={de.screens.fallakte}>
        <Text variant="body">{de.result.missing}</Text>
      </CaseScreen>
    );
  }
  const device = state.devices.find((d) => d.id === c.deviceId);
  const events = selectCaseEvents(state, caseId);
  const consents = state.consents.filter((x) => x.caseId === caseId);

  return (
    <CaseScreen title={de.screens.fallakte}>
      <Text variant="meta">{de.common.dot(t.title(c.id), device ? deviceTitle(device) : '')}</Text>
      <Text variant="h1" accessibilityRole="header">
        {c.problemLabel}
      </Text>
      <Text variant="body">{t.status(caseStatusLabel(c.status))}</Text>

      <CaseFileCard caseId={caseId} detail="voll" />

      <View style={styles.section}>
        <Text variant="title" accessibilityRole="header">
          {t.shared}
        </Text>
        {consents.length === 0 ? (
          <Text variant="body">{t.none}</Text>
        ) : (
          consents.map((x) => (
            <Text key={x.id} variant="body">
              {de.common.dot(
                t.sharedLine(x.recipient.name, formatDateTime(x.grantedAt)),
                x.revokedAt ? t.revoked(formatDateTime(x.revokedAt)) : '',
              )}
            </Text>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text variant="title" accessibilityRole="header">
          {t.history}
        </Text>
        <Card>
          <Timeline
            items={events.map((e) => ({ when: formatDateTime(e.at), what: eventLabel(e) }))}
          />
        </Card>
      </View>
    </CaseScreen>
  );
}

const styles = StyleSheet.create({
  section: { gap: 8, marginTop: 8 },
});
