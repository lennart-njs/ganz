import { router } from 'expo-router';

import { PlaceholderScreen } from '@/components/nav/PlaceholderScreen';
import { de } from '@/i18n/de';
import { useAppStore } from '@/store/appStore';

export default function Profil() {
  const reset = useAppStore((s) => s.reset);
  return (
    <PlaceholderScreen
      title={de.screens.profil}
      step={12}
      back={false}
      actions={[
        { label: de.nav.gallery, onPress: () => router.push('/galerie') },
        // Nach dem Zurücksetzen schaltet Stack.Protected auf das Onboarding um.
        { label: de.nav.restartOnboarding, onPress: reset },
      ]}
    />
  );
}
