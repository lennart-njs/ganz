import { router } from 'expo-router';

import { DeviceSetup } from '@/components/app/DeviceSetup';

export default function GeraetNeu() {
  return (
    <DeviceSetup
      onBack={() => router.back()}
      onDone={(device) => router.replace(`/geraet/${device.id}`)}
    />
  );
}
