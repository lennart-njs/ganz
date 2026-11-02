import { router } from 'expo-router';

import { LinkContractForm } from '@/components/app/LinkContractForm';

export default function Schutz() {
  return (
    <LinkContractForm
      onBack={() => router.back()}
      onLinked={() => router.push('/geraet-bestaetigen')}
      onSkip={() => router.push('/geraet-bestaetigen')}
    />
  );
}
