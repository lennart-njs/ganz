import { router } from 'expo-router';

import { DeviceScan } from '@/components/app/DeviceScan';
import { useAppStore } from '@/store/appStore';

export default function OnboardingTypenschild() {
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  return <DeviceScan onBack={() => router.back()} onDone={() => completeOnboarding()} />;
}
