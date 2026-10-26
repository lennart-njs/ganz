import { router } from 'expo-router';

import { DEMO_CASE_ID } from '@/components/nav/demoIds';
import { PlaceholderScreen } from '@/components/nav/PlaceholderScreen';
import { de } from '@/i18n/de';

export default function Faelle() {
  return (
    <PlaceholderScreen
      title={de.screens.faelle}
      step={12}
      back={false}
      actions={[
        {
          label: de.nav.caseRow(DEMO_CASE_ID),
          onPress: () => router.push(`/fall/${DEMO_CASE_ID}/fallakte`),
        },
      ]}
    />
  );
}
