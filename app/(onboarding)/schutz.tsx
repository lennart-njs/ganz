import { router } from 'expo-router';

import { LinkContractForm } from '@/components/app/LinkContractForm';
import { de } from '@/i18n/de';

export default function Schutz() {
  return (
    <LinkContractForm
      onBack={() => router.back()}
      onLinked={() => router.push('/geraet-bestaetigen')}
      onSkip={() => router.push('/geraet-bestaetigen')}
      title={de.onboarding.extraTitle}
      text={de.onboarding.extraText}
      skipLabel={de.onboarding.noExtra}
    />
  );
}
