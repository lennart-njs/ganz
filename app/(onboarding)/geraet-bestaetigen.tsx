import { router } from 'expo-router';

import { DeviceCard } from '@/components/app/DeviceCard';
import { ActionBar, AppHeader, Button, NavRow, Screen, Text } from '@/components/ds';
import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';
import { formatMonthYear } from '@/i18n/format';
import { deviceTitle } from '@/lib/devices';
import { selectContract, useAppStore } from '@/store/appStore';

const t = de.onboarding;

export default function GeraetBestaetigen() {
  const contract = useAppStore(selectContract);
  const addDevice = useAppStore((s) => s.addDevice);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const cfg = demoConfig.device;
  const title = deviceTitle({ manufacturerId: demoConfig.manufacturer.id, model: cfg.model });

  // Nach dem Abschluss schaltet Stack.Protected auf die Tabs um.
  const confirm = () => {
    addDevice({
      manufacturerId: demoConfig.manufacturer.id,
      category: cfg.category,
      model: cfg.model,
      purchaseDate: cfg.purchaseDate,
      contractId: contract?.id,
      identifiedBy: 'vertrag',
    });
    completeOnboarding();
  };

  const header = <AppHeader title={de.screens.geraetBestaetigen} onBack={() => router.back()} />;
  const scan = () => router.push('/typenschild');

  if (!contract) {
    return (
      <Screen
        header={header}
        footer={
          <ActionBar>
            <Button label={t.addDevice} size="lg" fullWidth icon="camera" onPress={scan} />
            <Button
              label={t.skipDevice}
              variant="secondary"
              fullWidth
              onPress={completeOnboarding}
            />
          </ActionBar>
        }
      >
        <Text variant="h1" accessibilityRole="header">
          {t.firstDeviceTitle}
        </Text>
        <Text variant="body">{t.firstDeviceText}</Text>
      </Screen>
    );
  }

  return (
    <Screen
      header={header}
      footer={
        <ActionBar>
          <Button label={t.confirmYes} size="lg" fullWidth onPress={confirm} />
        </ActionBar>
      }
    >
      <Text variant="meta">{t.linked(contract.productName, contract.provider.name)}</Text>
      <Text variant="h1" accessibilityRole="header">
        {t.confirmTitle}
      </Text>
      <Text variant="body">{t.confirmText(contract.provider.name)}</Text>
      <DeviceCard
        title={title}
        meta={de.device.meta(de.deviceCategory[cfg.category], formatMonthYear(cfg.purchaseDate))}
        status={de.deviceStatus.laeuft}
        protectedBy
      />
      <NavRow title={t.otherDevice} sub={t.otherDeviceSub} onPress={scan} />
    </Screen>
  );
}
