import { PlaceholderScreen } from '@/components/nav/PlaceholderScreen';
import { de } from '@/i18n/de';
import { useAppStore } from '@/store/appStore';

export default function GeraetBestaetigen() {
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  // Nach dem Abschluss schaltet Stack.Protected auf die Tabs um.
  return (
    <PlaceholderScreen
      title={de.screens.geraetBestaetigen}
      step={5}
      primary={{ label: de.nav.onboardingDone, onPress: completeOnboarding }}
    />
  );
}
