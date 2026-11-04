import { StyleSheet, View } from 'react-native';

import { Card, FactList, Icon, Text, type Fact } from '@/components/ds';
import { de } from '@/i18n/de';
import { formatDateTime, formatEuro } from '@/i18n/format';
import { guideSummary, latestDiagnosis } from '@/lib/caseView';
import { deviceTitle } from '@/lib/devices';
import type { DataCategory } from '@/model/policies/consentScopes';
import { useAppStore } from '@/store/appStore';

/** Für Tests: die Karte auf dem Screen finden */
export const CASE_FILE_CARD = 'case-file-card';

/** Die eigene Fallakte zeigt alles, was der Fall hat */
const OWN_FILE: readonly DataCategory[] = [
  'geraet',
  'problem',
  'ergebnis',
  'nachrichten',
  'schritte',
  'notiz',
  'fotos',
  'befund',
  'kosten',
];

interface CaseFileCardProps {
  caseId: string;
  /**
   * Nur diese Kategorien: die Vorschau einer Weitergabe. Sie kommen aus demselben Array wie die
   * Bestätigung (CONSENT_SCOPES, R-14). Ohne Angabe: die eigene Fallakte.
   */
  categories?: readonly DataCategory[];
}

/** Fallakte kompakt: Gerät, Problem, Ergebnis und die echten Schritte (B-22, B-53) */
export function CaseFileCard({ caseId, categories = OWN_FILE }: CaseFileCardProps) {
  const state = useAppStore();
  const c = state.cases[caseId];
  if (!c) return null;
  const show = (key: DataCategory) => categories.includes(key);
  const device = state.devices.find((d) => d.id === c.deviceId);
  const contract = state.contracts.find((k) => k.id === device?.contractId);
  const result =
    latestDiagnosis(state, c, 'fehlererkennung') ?? latestDiagnosis(state, c, 'nutzerangabe');
  const finding = latestDiagnosis(state, c, 'fachkraft') ?? latestDiagnosis(state, c, 'betrieb');
  const summary = guideSummary(state, c);
  const quote = state.quotes.find((q) => q.id === c.quoteId);
  const photos = state.photos.filter((p) => c.photoIds.includes(p.id));
  const t = de.help.facts;

  const facts: Fact[] = [];
  if (show('geraet')) facts.push([t.device, device ? deviceTitle(device) : '']);
  if (show('problem')) facts.push([t.problem, c.problemLabel]);
  if (result && show('ergebnis')) {
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
  if (chatCount && show('nachrichten')) {
    facts.push([de.chat.fileTitle, de.chat.fileCount(chatCount)]);
  }
  const steps = show('schritte');
  if (steps) {
    facts.push([
      t.steps,
      summary ? de.help.stepsDone(summary.done, summary.total) : de.help.notStarted,
    ]);
  }
  if (show('fotos')) {
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
  }
  if (finding && show('befund')) {
    facts.push([
      de.caseFile.finding,
      de.caseFile.findingLine(
        finding.component ?? de.finding.options.geloest,
        de.caseFile.by[finding.source === 'betrieb' ? 'betrieb' : 'fachkraft'],
      ),
    ]);
  }
  if (quote && show('kosten')) {
    facts.push([
      de.caseFile.costs,
      de.caseFile.costsLine(formatEuro(quote.repair.total), formatEuro(quote.replacement.total)),
    ]);
  }

  return (
    <Card testID={CASE_FILE_CARD}>
      <Text variant="labelStrong" accessibilityRole="header">
        {de.help.fileTitle}
      </Text>
      {contract && show('vertrag') ? (
        <Text variant="meta" style={styles.contract}>
          {de.costs.previewContract(contract.contractNumber)}
        </Text>
      ) : null}
      <View style={styles.facts}>
        <FactList items={facts} dense />
      </View>
      {steps && summary && summary.completedTitles.length > 0 ? (
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
      {steps && summary?.aborted ? (
        <Text variant="meta" tone="strong" style={styles.aborted}>
          {de.help.abortedAt(summary.aborted.step, summary.aborted.title)}
        </Text>
      ) : null}
      {show('notiz') && summary?.aborted?.note ? (
        <Text variant="meta">{de.a11y.fact(t.note, summary.aborted.note)}</Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  facts: { marginTop: 10 },
  contract: { marginTop: 6 },
  steps: { marginTop: 12, gap: 6 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aborted: { marginTop: 10 },
});
