import { router } from 'expo-router';

import { DeviceSetup } from '@/components/app/DeviceSetup';
import { useAppStore } from '@/store/appStore';

/** Onboarding: erstes Gerät anlegen, dann Versicherung oder Händler (Entscheidung 16) */
export default function GeraetAnlegen() {
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  return (
    <DeviceSetup
      onBack={() => router.back()}
      onDone={() => completeOnboarding()}
      onSkip={completeOnboarding}
    />
  );
}
