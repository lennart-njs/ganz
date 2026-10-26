import { router } from 'expo-router';

import { PlaceholderScreen } from '@/components/nav/PlaceholderScreen';
import { de } from '@/i18n/de';

export default function Schutz() {
  return (
    <PlaceholderScreen
      title={de.screens.schutz}
      step={5}
      actions={[{ label: de.nav.later, onPress: () => router.push('/geraet-bestaetigen') }]}
      primary={{ label: de.nav.next, onPress: () => router.push('/geraet-bestaetigen') }}
    />
  );
}
