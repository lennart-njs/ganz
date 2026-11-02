import { router, useLocalSearchParams } from 'expo-router';

import { DeviceSetup } from '@/components/app/DeviceSetup';
import { LinkContractForm } from '@/components/app/LinkContractForm';

/** Versicherung oder Händler nachträglich ändern (mit Gerät) oder den Demo-Vertrag verknüpfen */
export default function SchutzVerknuepfen() {
  const { geraet } = useLocalSearchParams<{ geraet?: string }>();
  if (geraet) {
    return (
      <DeviceSetup deviceId={geraet} onBack={() => router.back()} onDone={() => router.back()} />
    );
  }
  return <LinkContractForm onBack={() => router.back()} onLinked={() => router.back()} />;
}
