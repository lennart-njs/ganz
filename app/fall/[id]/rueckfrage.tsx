import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CaseScreen, useCaseId } from '@/components/app/CaseScreen';
import { ActionBar, Button, ChoiceChip, Text } from '@/components/ds';
import { guides, type GuideId } from '@/data/guides';
import { de } from '@/i18n/de';
import { isPhotoMode, toDiagnosis } from '@/lib/diagnosis';
import { services, type QuestionAnswer } from '@/services';
import { useAppStore } from '@/store/appStore';

const answers: QuestionAnswer[] = ['ablauf', 'zulauf', 'unklar'];

/** Rückfrage bei unsicherem Ergebnis (B-12) */
export default function Rueckfrage() {
  const caseId = useCaseId();
  const params = useLocalSearchParams<{ foto?: string; modus?: string }>();
  const mode = isPhotoMode(params.modus) ? params.modus : 'display';
  const [answer, setAnswer] = useState<QuestionAnswer>();

  const next = () => {
    if (!answer) return;
    const s = useAppStore.getState();
    s.addEvent({
      caseId,
      type: 'rueckfrage_beantwortet',
      actor: { kind: 'haushalt', id: s.persons[0]?.id },
      payload: { question: de.question.wasser, answer: de.question.answers[answer] },
    });
    const finding = services.diagnosis.answer(answer);
    if (!finding) {
      s.escalate(caseId);
      router.replace(`/fall/${caseId}/hilfe`);
      return;
    }
    s.updateCase(caseId, { problemLabel: guides[finding.guideId as GuideId].title });
    s.addDiagnosis(toDiagnosis(caseId, params.foto ? [params.foto] : [], mode, finding));
    router.replace(`/fall/${caseId}/ergebnis`);
  };

  return (
    <CaseScreen
      title={de.screens.rueckfrage}
      footer={
        <ActionBar>
          <Button label={de.question.next} size="lg" fullWidth disabled={!answer} onPress={next} />
        </ActionBar>
      }
    >
      <Text variant="meta">{de.question.title}</Text>
      <Text variant="h1" accessibilityRole="header">
        {de.question.wasser}
      </Text>
      <Text variant="body">{de.question.text}</Text>
      <View
        style={styles.answers}
        accessibilityRole="radiogroup"
        accessibilityLabel={de.question.wasser}
      >
        {answers.map((a) => (
          <ChoiceChip
            key={a}
            label={de.question.answers[a]}
            selected={answer === a}
            onPress={() => setAnswer(a)}
          />
        ))}
      </View>
    </CaseScreen>
  );
}

const styles = StyleSheet.create({
  answers: { gap: 8 },
});
