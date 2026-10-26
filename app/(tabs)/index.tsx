import { router } from 'expo-router';

import { DEMO_CASE_ID, DEMO_DEVICE_ID, DEMO_DEVICE_LABEL } from '@/components/nav/demoIds';
import { PlaceholderScreen } from '@/components/nav/PlaceholderScreen';
import { de } from '@/i18n/de';

export default function Geraete() {
  return (
    <PlaceholderScreen
      title={de.screens.geraete}
      step={5}
      back={false}
      actions={[
        { label: de.nav.openCase, onPress: () => router.push(`/fall/${DEMO_CASE_ID}/status`) },
        { label: de.nav.whatIsBroken, onPress: () => router.push('/fall/neu') },
        { label: DEMO_DEVICE_LABEL, onPress: () => router.push(`/geraet/${DEMO_DEVICE_ID}`) },
        { label: de.nav.addDevice, onPress: () => router.push('/geraet/neu') },
      ]}
    />
  );
}
