import { router } from 'expo-router';
import { Image, StyleSheet, View } from 'react-native';

import { DemoHint } from '@/components/app/DemoHint';
import { CaseScreen, useCaseId } from '@/components/app/CaseScreen';
import { ActionBar, Button, Card, ConfidenceLabel, FactList, InfoBox, Text } from '@/components/ds';
import { demoConfig } from '@/config/demo.config';
import { guides, type GuideId } from '@/data/guides';
import { de } from '@/i18n/de';
import { formatEuro } from '@/i18n/format';
import { deviceTitle, getManufacturer } from '@/lib/devices';
import type { ErrorPattern } from '@/services';
import { useAppStore } from '@/store/appStore';
import { useTheme } from '@/theme';

const t = de.result;

/** Ergebnis der Intelligenten Fehlererkennung. Kostenhinweis ohne Zusage (B-13). */
export default function Ergebnis() {
  const theme = useTheme();
  const caseId = useCaseId();
  const state = useAppStore();
  const c = state.cases[caseId];
  const diagnosis = c ? state.diagnoses.find((d) => d.id === c.diagnosisIds.at(-1)) : undefined;
  const device = state.devices.find((d) => d.id === c?.deviceId);
  const photo = state.photos.find((p) => p.id === diagnosis?.photoIds[0]);
  const contract = state.contracts.find((k) => k.id === device?.contractId);

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

  const pattern = diagnosis.errorPattern as ErrorPattern;
  const guide = guides[diagnosis.guideId as GuideId];
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

  const startGuide = () => {
    useAppStore.getState().startGuide(caseId, guide.id);
    router.push(`/fall/${caseId}/anleitung`);
  };

  const help = () => {
    useAppStore.getState().escalate(caseId);
    router.push(`/fall/${caseId}/hilfe`);
  };

  return (
    <CaseScreen
      title={de.screens.ergebnis}
      footer={
        <ActionBar meta={t.stepsCount(guide.steps.length)} sub={t.source(manufacturer)}>
          <Button label={t.startGuide} onPress={startGuide} />
        </ActionBar>
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
      <Text variant="bodyLg">{t.selfHelp}</Text>
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
          ? t.costNote(demoConfig.insurer.shortName, formatEuro(state.demo.deductible))
          : t.costNoteNoContract}
      </InfoBox>

      <Button label={t.doesNotFit} variant="link" onPress={backToProblem} />
      <Button label={t.helpInstead} variant="link" onPress={help} />
    </CaseScreen>
  );
}

const styles = StyleSheet.create({
  from: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  thumb: { width: 64, height: 64, overflow: 'hidden' },
  fromText: { flex: 1 },
  confidence: { marginTop: 14 },
});
