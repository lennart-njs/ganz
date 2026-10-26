import { StyleSheet, View } from 'react-native';

import { Card, FactList, Icon, Text, type Fact } from '@/components/ds';
import { de } from '@/i18n/de';
import { formatDateTime, formatEuro } from '@/i18n/format';
import { guideSummary, latestDiagnosis } from '@/lib/caseView';
import { deviceTitle } from '@/lib/devices';
import { useAppStore } from '@/store/appStore';

interface CaseFileCardProps {
  caseId: string;
  /** 'voll' zeigt auch Fotos, Befund und Kosten: so kommt der Fall beim Versicherer an */
  detail?: 'kurz' | 'voll';
}

/** Fallakte kompakt: Gerät, Problem, Ergebnis und die echten Schritte (B-22, B-53) */
export function CaseFileCard({ caseId, detail = 'kurz' }: CaseFileCardProps) {
  const state = useAppStore();
  const c = state.cases[caseId];
  if (!c) return null;
  const device = state.devices.find((d) => d.id === c.deviceId);
  const result =
    latestDiagnosis(state, c, 'fehlererkennung') ?? latestDiagnosis(state, c, 'nutzerangabe');
  const finding = latestDiagnosis(state, c, 'fachkraft') ?? latestDiagnosis(state, c, 'betrieb');
  const summary = guideSummary(state, c);
  const quote = state.quotes.find((q) => q.id === c.quoteId);
  const photos = state.photos.filter((p) => c.photoIds.includes(p.id));
  const t = de.help.facts;

  const facts: Fact[] = [
    [t.device, device ? deviceTitle(device) : ''],
    [t.problem, c.problemLabel],
  ];
  if (result) {
    facts.push([
      t.result,
      result.errorPattern === 'ohne_anleitung'
        ? de.caseFile.noGuide
        : result.errorPattern === 'geraet_erkannt'
          ? de.result.deviceTitle
          : result.source === 'nutzerangabe' && result.displayMessage
            ? de.caseFile.messageLine(result.displayMessage)
            : de.caseFile.resultLine(
                result.component ?? '',
                de.ds.confidenceLevel[result.confidence],
              ),
    ]);
  }
  const chatCount = state.chatMessages.filter((m) => m.caseId === caseId).length;
  if (chatCount) facts.push([de.chat.fileTitle, de.chat.fileCount(chatCount)]);
  facts.push([
    t.steps,
    summary ? de.help.stepsDone(summary.done, summary.total) : de.help.notStarted,
  ]);
  if (detail === 'voll') {
    facts.push([
      de.caseFile.photos,
      photos.length
        ? photos
            .map((p) =>
              de.caseFile.photoLine(de.caseFile.photoPurpose[p.purpose], formatDateTime(p.takenAt)),
            )
            .join('\n')
        : de.caseFile.noPhotos,
    ]);
    if (finding) {
      facts.push([
        de.caseFile.finding,
        de.caseFile.findingLine(
          finding.component ?? de.finding.options.geloest,
          de.caseFile.by[finding.source === 'betrieb' ? 'betrieb' : 'fachkraft'],
        ),
      ]);
    }
    if (quote) {
      facts.push([
        de.caseFile.costs,
        de.caseFile.costsLine(formatEuro(quote.repair.total), formatEuro(quote.replacement.total)),
      ]);
    }
  }

  return (
    <Card>
      <Text variant="labelStrong" accessibilityRole="header">
        {de.help.fileTitle}
      </Text>
      <View style={styles.facts}>
        <FactList items={facts} dense />
      </View>
      {summary && summary.completedTitles.length > 0 ? (
        <View style={styles.steps}>
          {summary.completedTitles.map((title, i) => (
            <View key={`${title}-${i}`} style={styles.step} accessible accessibilityLabel={title}>
              <Icon name="check" size={16} strokeWidth={2.4} />
              <Text variant="meta" tone="strong">
                {title}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      {summary?.aborted ? (
        <Text variant="meta" tone="strong" style={styles.aborted}>
          {de.help.abortedAt(summary.aborted.step, summary.aborted.title)}
        </Text>
      ) : null}
      {summary?.aborted?.note ? (
        <Text variant="meta">{de.a11y.fact(t.note, summary.aborted.note)}</Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  facts: { marginTop: 10 },
  steps: { marginTop: 12, gap: 6 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aborted: { marginTop: 10 },
});
