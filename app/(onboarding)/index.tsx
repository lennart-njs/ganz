import { Redirect } from 'expo-router';

/** Vor dem Onboarding zeigt „/“ hierher, danach auf die Tabs (Stack.Protected im Root-Layout). */
export default function OnboardingStart() {
  return <Redirect href="/willkommen" />;
}
