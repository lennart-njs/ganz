import { router } from 'expo-router';

import { LinkContractForm } from '@/components/app/LinkContractForm';

/** Schutz nachträglich verknüpfen, z. B. aus Gerätedetail oder Profil */
export default function SchutzVerknuepfen() {
  return <LinkContractForm onBack={() => router.back()} onLinked={() => router.back()} />;
}
