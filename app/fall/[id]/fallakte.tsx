import { CaseFileCard } from '@/components/app/CaseFileCard';
import { CaseScreen, useCaseId } from '@/components/app/CaseScreen';
import { Card, Section, Text, Timeline } from '@/components/ds';
import { de } from '@/i18n/de';
import { formatDateTime } from '@/i18n/format';
import { eventLabel } from '@/lib/caseEvents';
import { assistantTransfer } from '@/lib/chat/context';
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
  // Die Einwilligung für den Assistenten gilt für alle Fälle. Hier steht, was aus diesem Fall an
  // ihn ging (R-15). Ältere Stände speicherten sie mit Fall, die Zeile darunter ersetzt sie.
  const consents = state.consents.filter(
    (x) => x.caseId === caseId && x.purpose !== 'chat_assistent',
  );
  const assistant = assistantTransfer(state, caseId);

  return (
    <CaseScreen title={de.screens.fallakte}>
      <Text variant="meta">{de.common.dot(t.title(c.id), device ? deviceTitle(device) : '')}</Text>
      <Text variant="h1" accessibilityRole="header">
        {c.problemLabel}
      </Text>
      <Text variant="body">{t.status(caseStatusLabel(c.status))}</Text>

      <Section title={t.overview}>
        <CaseFileCard caseId={caseId} />
      </Section>

      <Section
        title={t.shared}
        summary={de.device.casesCountShared(consents.length + (assistant ? 1 : 0))}
      >
        {consents.length === 0 && !assistant ? <Text variant="body">{t.none}</Text> : null}
        {consents.map((x) => (
          <Text key={x.id} variant="body">
            {de.common.dot(
              t.sharedLine(x.recipient.name, formatDateTime(x.grantedAt)),
              x.revokedAt ? t.revoked(formatDateTime(x.revokedAt)) : '',
            )}
          </Text>
        ))}
        {assistant ? (
          <Text variant="body">
            {de.common.dot(
              t.assistantLine(
                assistant.recipient,
                de.chat.fileCount(assistant.count),
                formatDateTime(assistant.lastAt),
              ),
              assistant.revokedAt ? t.revoked(formatDateTime(assistant.revokedAt)) : '',
            )}
          </Text>
        ) : null}
      </Section>

      <Section title={t.history} summary={t.eventsCount(events.length)}>
        <Card>
          <Timeline
            items={events.map((e) => ({ when: formatDateTime(e.at), what: eventLabel(e) }))}
          />
        </Card>
      </Section>
    </CaseScreen>
  );
}
