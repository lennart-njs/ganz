import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import {
  ActionBar,
  AppHeader,
  Button,
  Card,
  ChoiceChip,
  FactList,
  PhotoFrame,
  Screen,
  Text,
  TextField,
} from '@/components/ds';
import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';
import { deviceTitle, getManufacturer } from '@/lib/devices';
import type { Device, DeviceCategory } from '@/model/types';
import { services, type TypePlateData } from '@/services';
import { useAppStore } from '@/store/appStore';
import { useTheme } from '@/theme';

import { CameraCapture } from './CameraCapture';

type Phase = 'intro' | 'camera' | 'reading' | 'result' | 'error' | 'form';

const categories: DeviceCategory[] = [
  'waschmaschine',
  'geschirrspueler',
  'trockner',
  'kuehlschrank',
];

interface DeviceScanProps {
  onBack: () => void;
  onDone: (device: Device) => void;
}

/** Gerät hinzufügen: Typenschild fotografieren, Ergebnis prüfen und ändern, oder manuell (B-38). */
export function DeviceScan({ onBack, onDone }: DeviceScanProps) {
  const theme = useTheme();
  const scenario = useAppStore((s) => s.demo.scanScenario);
  const addDevice = useAppStore((s) => s.addDevice);
  const [phase, setPhase] = useState<Phase>('intro');
  const [data, setData] = useState<TypePlateData>({
    manufacturerId: demoConfig.manufacturer.id,
    category: demoConfig.device.category,
    model: '',
  });
  const [modelError, setModelError] = useState<string | undefined>();
  const [fromScan, setFromScan] = useState(false);

  const read = async () => {
    setPhase('reading');
    const result = await services.typePlate.read(scenario);
    if (result.ok) {
      setData(result.data);
      setFromScan(true);
      setPhase('result');
    } else {
      setPhase('error');
    }
  };

  const save = () => {
    if (!data.model.trim()) {
      setModelError(de.scan.modelRequired);
      return;
    }
    const device = addDevice({
      manufacturerId: data.manufacturerId,
      category: data.category,
      model: data.model.trim(),
      materialNumber: data.materialNumber?.trim() || undefined,
      serialNumber: data.serialNumber?.trim() || undefined,
      identifiedBy: fromScan ? 'typenschild_scan' : 'manuell',
    });
    onDone(device);
  };

  const header = (
    <AppHeader
      title={de.screens.geraetNeu}
      onBack={phase === 'intro' ? onBack : () => setPhase('intro')}
    />
  );

  if (phase === 'camera') {
    return (
      <Screen header={header} scroll={false}>
        <CameraCapture help={de.camera.help.typenschild} onCapture={read} />
      </Screen>
    );
  }

  if (phase === 'reading') {
    return (
      <Screen header={header} scroll={false}>
        <View style={styles.center} accessible accessibilityLabel={de.scan.reading}>
          <ActivityIndicator color={theme.colors.textStrong} />
          <Text variant="body">{de.scan.reading}</Text>
        </View>
      </Screen>
    );
  }

  if (phase === 'result') {
    const facts = [
      [de.device.deviceFacts.manufacturer, getManufacturer(data.manufacturerId).name],
      [de.device.deviceFacts.model, data.model],
      [de.device.deviceFacts.category, de.deviceCategory[data.category]],
      ...(data.materialNumber ? [[de.device.deviceFacts.materialNumber, data.materialNumber]] : []),
      ...(data.serialNumber ? [[de.device.deviceFacts.serialNumber, data.serialNumber]] : []),
    ] as [string, string][];
    return (
      <Screen
        header={header}
        footer={
          <ActionBar>
            <Button label={de.scan.accept} size="lg" fullWidth onPress={save} />
            <Button
              label={de.scan.edit}
              variant="secondary"
              fullWidth
              onPress={() => setPhase('form')}
            />
          </ActionBar>
        }
      >
        <Text variant="meta">{de.scan.recognized}</Text>
        <Text variant="h1" accessibilityRole="header">
          {deviceTitle(data)}
        </Text>
        <Text variant="body">{de.scan.recognizedText}</Text>
        <Card>
          <FactList items={facts} />
        </Card>
      </Screen>
    );
  }

  if (phase === 'form') {
    return (
      <Screen
        header={header}
        footer={
          <ActionBar>
            <Button label={de.scan.save} size="lg" fullWidth onPress={save} />
          </ActionBar>
        }
      >
        <Text variant="h1" accessibilityRole="header">
          {de.scan.formTitle}
        </Text>
        <Text variant="meta" tone="muted">
          {de.scan.manufacturer}
        </Text>
        <View style={styles.chips} accessibilityRole="radiogroup">
          <ChoiceChip label={demoConfig.manufacturer.name} selected onPress={() => undefined} />
        </View>
        <Text variant="meta">{de.scan.manufacturerHint}</Text>
        <Text variant="meta" tone="muted">
          {de.scan.category}
        </Text>
        <View style={styles.chips} accessibilityRole="radiogroup">
          {categories.map((c) => (
            <ChoiceChip
              key={c}
              label={de.deviceCategory[c]}
              selected={data.category === c}
              onPress={() => setData({ ...data, category: c })}
            />
          ))}
        </View>
        <TextField
          label={de.scan.model}
          placeholder={de.common.example(demoConfig.device.model)}
          value={data.model}
          error={modelError}
          onChangeText={(model) => {
            setModelError(undefined);
            setData({ ...data, model });
          }}
          autoCapitalize="characters"
        />
        <TextField
          label={de.scan.materialNumber}
          value={data.materialNumber ?? ''}
          onChangeText={(materialNumber) => setData({ ...data, materialNumber })}
          keyboardType="numbers-and-punctuation"
        />
        <TextField
          label={de.scan.serialNumber}
          value={data.serialNumber ?? ''}
          onChangeText={(serialNumber) => setData({ ...data, serialNumber })}
          keyboardType="numbers-and-punctuation"
        />
      </Screen>
    );
  }

  const error = phase === 'error';
  return (
    <Screen
      header={header}
      footer={
        <ActionBar>
          <Button
            label={error ? de.scan.retry : de.scan.takePhoto}
            size="lg"
            fullWidth
            icon="camera"
            onPress={() => setPhase('camera')}
          />
          <Button
            label={de.scan.manual}
            variant="secondary"
            fullWidth
            onPress={() => {
              setFromScan(false);
              setPhase('form');
            }}
          />
        </ActionBar>
      }
    >
      <Text variant="h1" accessibilityRole="header">
        {error ? de.scan.notRecognizedTitle : de.scan.title}
      </Text>
      {error ? null : <PhotoFrame label={de.camera.modes.typenschild} />}
      <Text variant="body" accessibilityLiveRegion={error ? 'polite' : undefined}>
        {error ? de.scan.notRecognizedText : de.scan.where}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
