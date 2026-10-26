import { router } from 'expo-router';

import { DEMO_CASE_ID } from '@/components/nav/demoIds';
import { PlaceholderScreen } from '@/components/nav/PlaceholderScreen';
import { de } from '@/i18n/de';

const go = (to: string) => () => router.push(`/fall/${DEMO_CASE_ID}/${to}`);

export default function ProblemMelden() {
  return (
    <PlaceholderScreen
      title={de.screens.problem}
      step={6}
      inCase
      actions={[
        { label: de.nav.takePhoto, onPress: go('kamera') },
        { label: de.nav.displayMessage, onPress: go('meldungen') },
        { label: de.nav.symptom, onPress: go('anleitung') },
        { label: de.nav.somethingElse, onPress: go('hilfe') },
      ]}
    />
  );
}
