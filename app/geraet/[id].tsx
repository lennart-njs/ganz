import { router, useLocalSearchParams } from 'expo-router';

import { DEMO_DEVICE_LABEL } from '@/components/nav/demoIds';
import { PlaceholderScreen } from '@/components/nav/PlaceholderScreen';
import { de } from '@/i18n/de';

export default function GeraetDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <PlaceholderScreen
      title={DEMO_DEVICE_LABEL}
      step={5}
      actions={[
        { label: de.nav.reportProblem, onPress: () => router.push(`/fall/neu?geraet=${id}`) },
        { label: de.nav.maintenance, onPress: () => router.push(`/fall/neu?geraet=${id}`) },
      ]}
    />
  );
}
