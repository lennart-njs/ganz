import { router } from 'expo-router';
import { Image, StyleSheet, View } from 'react-native';

import { DemoHint } from '@/components/app/DemoHint';
import { CaseScreen, useCaseId } from '@/components/app/CaseScreen';
import { backToThread } from '@/components/nav/leaveCase';
import {
  ActionBar,
  Button,
  Card,
  ConfidenceLabel,
  FactList,
  InfoBox,
  Text,
  Toast,
} from '@/components/ds';
import { useCommand } from '@/hooks/useCommand';
import { de } from '@/i18n/de';
import { formatEuro } from '@/i18n/format';
import { latestDiagnosis } from '@/lib/caseView';
import { deviceTitle, getManufacturer } from '@/lib/devices';
import { getGuide } from '@/lib/guideCatalog';
import { can } from '@/model/policies/actions';
import { selectCaseFacts } from '@/model/policies/caseFacts';
import type { ErrorPattern } from '@/services';
import { useAppStore } from '@/store/appStore';
import { useTheme } from '@/theme';
import { insurerShortName } from '@/lib/service';

const t = de.result;

/**
 * Ergebnis der Intelligenten Fehlererkennung. Kostenhinweis ohne Zusage (B-13). Die Wege daraus
 * (Anleitung, „Passt nicht“, Hilfe) gibt es nur, solange die Regeln sie erlauben. Später bleibt
 * das Ergebnis als Detail lesbar.
 */
export default function Ergebnis() {
  const theme = useTheme();
  const caseId = useCaseId();
  const state = useAppStore();
  const c = state.cases[caseId];
  const caseFacts = selectCaseFacts(state, caseId);
  const canChange = can(caseFacts, 'problem_aendern');
  const canHelp = can(caseFacts, 'hilfe_holen');
  // Das letzte Ergebnis der Fehlererkennung, nicht ein späterer Befund der Fachkraft
  const diagnosis = c
    ? (latestDiagnosis(state, c, 'fehlererkennung') ?? latestDiagnosis(state, c, 'nutzerangabe'))
    : undefined;
  const device = state.devices.find((d) => d.id === c?.deviceId);
  const photo = state.photos.find((p) => p.id === diagnosis?.photoIds[0]);
  const contract = state.contracts.find((k) => k.id === device?.contractId);
  // Läuft diese Anleitung schon, geht startGuide dort weiter (B-05, R-06). Ein zweiter Tap
  // startet nichts doppelt. Die Anleitung läuft im Gespräch (Entscheidung 25).
  const start = useCommand(
    (guideId: string) => useAppStore.getState().startGuide(caseId, guideId),
    () => backToThread(caseId),
  );

  if (!c || !diagnosis || !device) {
    return (
      <CaseScreen title={de.screens.ergebnis}>
        <Text variant="body">{t.missing}</Text>
      </CaseScreen>
    );
  }

  const backToProblem = () => router.dismissTo(`/fall/neu?fall=${caseId}`);

  if (diagnosis.errorPattern === 'geraet_erkannt') {
    return (
      <CaseScreen
        title={de.screens.ergebnis}
        footer={
          canChange ? (
            <ActionBar>
              <Button
                label={t.photoDisplay}
                size="lg"
                fullWidth
                icon="camera"
                onPress={() => router.dismissTo(`/fall/${caseId}/kamera`)}
              />
              <Button label={t.describe} variant="secondary" fullWidth onPress={backToProblem} />
            </ActionBar>
          ) : undefined
        }
      >
        <Text variant="meta">{t.from.typenschild}</Text>
        <Text variant="h1" accessibilityRole="header">
          {t.deviceTitle}
        </Text>
        <Card>
          <FactList
            items={[
              [t.facts.device, deviceTitle(device)],
              [de.device.deviceFacts.category, de.deviceCategory[device.category]],
            ]}
          />
        </Card>
        <Text variant="body">{t.deviceText}</Text>
      </CaseScreen>
    );
  }

  const help = () => {
    useAppStore.getState().escalate(caseId);
    backToThread(caseId);
  };

  if (diagnosis.errorPattern === 'ohne_anleitung') {
    return (
      <CaseScreen
        title={de.screens.ergebnis}
        footer={
          canHelp || canChange ? (
            <ActionBar>
              {canHelp ? <Button label={t.getHelp} size="lg" fullWidth onPress={help} /> : null}
              {canChange ? (
                <Button label={t.describe} variant="secondary" fullWidth onPress={backToProblem} />
              ) : null}
            </ActionBar>
          ) : undefined
        }
      >
        <Text variant="meta">
          {t.from[diagnosis.mode as keyof typeof t.from] ?? t.from.display}
        </Text>
        <Text variant="h1" accessibilityRole="header">
          {t.noGuideTitle}
        </Text>
        <Card>
          <FactList
            items={[
              [t.facts.device, deviceTitle(device)],
              [de.device.deviceFacts.category, de.deviceCategory[device.category]],
            ]}
          />
        </Card>
        {/* Kann ohne Schutz etwa der Händler die Kosten übernehmen (Regulierer), steht noch nicht
            fest, wer zahlt: dann kein „zahlst du selbst“ (Übertragung 4.1) */}
        <InfoBox>
          {contract
            ? de.help.costNote(insurerShortName(state, caseId), formatEuro(state.demo.deductible))
            : caseFacts?.regulator
              ? de.result.costNoteNoContract
              : de.help.costNoteNoContract}
        </InfoBox>
        <Button label={de.chat.entry} variant="link" onPress={() => backToThread(caseId)} />
      </CaseScreen>
    );
  }

  const pattern = diagnosis.errorPattern as ErrorPattern;
  const guide = getGuide(diagnosis.guideId);
  if (!guide) {
    return (
      <CaseScreen title={de.screens.ergebnis}>
        <Text variant="body">{t.missing}</Text>
      </CaseScreen>
    );
  }
  const tools = [...new Set(guide.steps.map((s) => s.tool).filter((x): x is string => !!x))];
  const manufacturer = getManufacturer(device.manufacturerId).name;

  const facts: [string, string][] = [
    [t.facts.device, deviceTitle(device)],
    ...(diagnosis.displayMessage
      ? [[t.facts.message, t.quoted(diagnosis.displayMessage)] as [string, string]]
      : []),
    [t.facts.component, diagnosis.component ?? ''],
    [t.facts.damage, diagnosis.visibleDamage ?? t.noDamage],
  ];

  // Die Leiste sagt, wo eine laufende Anleitung steht
  const running = caseFacts?.guideRun?.guideId === guide.id ? caseFacts.guideRun : undefined;

  return (
    <CaseScreen
      title={de.screens.ergebnis}
      footer={
        <>
          {start.toast ? <Toast message={start.toast} style={styles.toast} /> : null}
          <ActionBar
            meta={
              running
                ? de.a11y.stepOf(running.currentStep + 1, guide.steps.length)
                : t.stepsCount(guide.steps.length)
            }
            sub={t.source(manufacturer)}
          >
            {can(caseFacts, 'anleitung_starten') ? (
              <Button label={t.startGuide} onPress={() => start.run(guide.id)} />
            ) : null}
          </ActionBar>
        </>
      }
    >
      <DemoHint id="ergebnis" />
      <View style={styles.from}>
        <View
          style={[
            styles.thumb,
            { borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceMuted },
          ]}
        >
          {photo?.uri ? (
            <Image source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} />
          ) : null}
        </View>
        <Text variant="meta" style={styles.fromText}>
          {t.from[diagnosis.mode as keyof typeof t.from] ?? t.from.display}
        </Text>
      </View>
      <Text variant="h1" accessibilityRole="header">
        {t.headline[pattern]}
      </Text>
      <Card>
        <FactList items={facts} ruled />
        <View style={styles.confidence}>
          <ConfidenceLabel level={diagnosis.confidence} />
        </View>
      </Card>

      <Text variant="title" accessibilityRole="header">
        {t.beforeTitle}
      </Text>
      <Text variant="body">{tools.length ? t.tools(tools.join(', ')) : t.noTools}</Text>

      <InfoBox>
        {contract
          ? t.costNote(insurerShortName(state, caseId), formatEuro(state.demo.deductible))
          : t.costNoteNoContract}
      </InfoBox>

      {canChange ? <Button label={t.doesNotFit} variant="link" onPress={backToProblem} /> : null}
      {canHelp ? <Button label={t.helpInstead} variant="link" onPress={help} /> : null}
    </CaseScreen>
  );
}

const styles = StyleSheet.create({
  from: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  thumb: { width: 64, height: 64, overflow: 'hidden' },
  fromText: { flex: 1 },
  confidence: { marginTop: 14 },
  toast: { marginHorizontal: 16, marginBottom: 8 },
});
