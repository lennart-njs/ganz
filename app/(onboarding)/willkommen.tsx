import { router } from 'expo-router';

import { PlaceholderScreen } from '@/components/nav/PlaceholderScreen';
import { de } from '@/i18n/de';

export default function Willkommen() {
  return (
    <PlaceholderScreen
      title={de.screens.willkommen}
      step={5}
      back={false}
      primary={{ label: de.nav.next, onPress: () => router.push('/schutz') }}
    />
  );
}
