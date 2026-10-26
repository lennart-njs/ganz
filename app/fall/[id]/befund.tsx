import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CaseScreen, useCaseId } from '@/components/app/CaseScreen';
import { ActionBar, Button, SelectCard, Text } from '@/components/ds';
import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';
import { caseAppliance } from '@/lib/appliance';
import { services, type FindingOption } from '@/services';
import { useAppStore } from '@/store/appStore';

const t = de.finding;
const options: FindingOption[] = ['geloest', 'reparatur', 'ersatzgeraet'];

/**
 * Befund nach dem Videocall (B-26). Das defekte Teil bestellt und baut immer der Betrieb ein (B-28).
 * „Ersatzteil an dich“ gibt es nur bei Teilen für Endnutzer und nicht im Golden Path.
 */
export default function Befund() {
  const caseId = useCaseId();
  const recommended = services.video.finding();
  const [choice, setChoice] = useState<FindingOption>(recommended);
  const a = useAppStore((s) => caseAppliance(s, caseId));
  const subs: Record<FindingOption, string> = {
    geloest: a.finding.solved,
    reparatur: a.finding.repairSub,
    ersatzgeraet: t.optionSubs.ersatzgeraet,
  };

  const next = () => {
    useAppStore.getState().setFinding(caseId, choice, 'fachkraft');
    if (choice === 'geloest') router.replace(`/fall/${caseId}/abschluss`);
    else router.push(`/fall/${caseId}/kosten`);
  };

  return (
    <CaseScreen
      title={de.screens.befund}
      footer={
        <ActionBar>
          <Button label={t.next} size="lg" fullWidth onPress={next} />
        </ActionBar>
      }
    >
      <Text variant="meta">{t.from(demoConfig.expert.name)}</Text>
      <Text variant="h1" accessibilityRole="header">
        {a.finding.title}
      </Text>
      <Text variant="bodyLg">{a.finding.text}</Text>
      <Text variant="title" accessibilityRole="header" style={styles.question}>
        {t.question}
      </Text>
      <Text variant="meta">{t.recommended(t.options[recommended])}</Text>
      <View style={styles.cards} accessibilityRole="radiogroup" accessibilityLabel={t.question}>
        {options.map((o) => (
          <SelectCard
            key={o}
            title={t.options[o]}
            sub={subs[o]}
            selected={choice === o}
            onPress={() => setChoice(o)}
          />
        ))}
      </View>
    </CaseScreen>
  );
}

const styles = StyleSheet.create({
  question: { marginTop: 8 },
  cards: { gap: 12 },
});
