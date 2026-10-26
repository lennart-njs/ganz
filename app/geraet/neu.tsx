import { router } from 'expo-router';

import { DeviceScan } from '@/components/app/DeviceScan';

export default function GeraetNeu() {
  return (
    <DeviceScan
      onBack={() => router.back()}
      onDone={(device) => router.replace(`/geraet/${device.id}`)}
    />
  );
}
