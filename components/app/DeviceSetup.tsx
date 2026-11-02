import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  ActionBar,
  AppHeader,
  Button,
  NavRow,
  Screen,
  SelectCard,
  Text,
  TextField,
} from '@/components/ds';
import { demoConfig } from '@/config/demo.config';
import { normalize, searchCatalog, type CatalogModel } from '@/data/catalog';
import { de } from '@/i18n/de';
import { deviceTitle } from '@/lib/devices';
import type { Device, Id } from '@/model/types';
import { useAppStore } from '@/store/appStore';

import { DeviceScan } from './DeviceScan';

type Phase = 'pick' | 'scan' | 'coverage' | 'insurer' | 'dealer';

const t = de.setup;
const UNKNOWN = 'unbekannt';

interface DeviceSetupProps {
  onBack: () => void;
  onDone: (device: Device) => void;
  /** Gerät gibt es schon: gleich zur Frage nach der Versicherung */
  deviceId?: Id;
  /** Onboarding: ohne Gerät weiter */
  onSkip?: () => void;
}

/** Durchsucht Name, Kurzname und Ort */
function matches(query: string, ...fields: (string | undefined)[]) {
  const q = normalize(query);
  return !q || normalize(fields.filter(Boolean).join(' ')).includes(q);
}

/**
 * Gerät anlegen (Entscheidung 16): Gerät aus dem Katalog wählen oder Typenschild fotografieren,
 * dann „Versicherung vorhanden?“. Ja: Versicherer aus der Liste und Police-Nr. Nein: Händler aus
 * der Liste. Beide Listen sind durchsuchbar.
 */
export function DeviceSetup({ onBack, onDone, deviceId, onSkip }: DeviceSetupProps) {
  const addDevice = useAppStore((s) => s.addDevice);
  const linkPolicy = useAppStore((s) => s.linkPolicy);
  const setDeviceDealer = useAppStore((s) => s.setDeviceDealer);
  const existing = useAppStore((s) => s.devices.find((d) => d.id === deviceId));
  const [device, setDevice] = useState<Device | undefined>(existing);
  const [phase, setPhase] = useState<Phase>(existing ? 'coverage' : 'pick');
  const [query, setQuery] = useState('');
  const [insurerId, setInsurerId] = useState<string>();
  const [policy, setPolicy] = useState('');
  const [dealerId, setDealerId] = useState<string>();
  const [error, setError] = useState<string>();

  const go = (next: Phase) => {
    setQuery('');
    setError(undefined);
    setPhase(next);
  };

  const back = () => {
    if (phase === 'pick' || (phase === 'coverage' && existing)) onBack();
    else if (phase === 'coverage') go('pick');
    else go('coverage');
  };

  const pickModel = (m: CatalogModel) => {
    const d = addDevice({
      manufacturerId: m.manufacturerId,
      category: m.category,
      model: m.model,
      identifiedBy: 'katalog',
    });
    setDevice(d);
    go('coverage');
  };

  const savePolicy = () => {
    if (!insurerId) return setError(t.pickInsurerFirst);
    if (!policy.trim()) return setError(t.policyEmpty);
    linkPolicy({ deviceId: device!.id, insurerId, policyNumber: policy });
    onDone(useAppStore.getState().devices.find((d) => d.id === device!.id)!);
  };

  const saveDealer = () => {
    if (!dealerId) return setError(t.pickDealerFirst);
    setDeviceDealer(device!.id, dealerId === UNKNOWN ? undefined : dealerId);
    onDone(useAppStore.getState().devices.find((d) => d.id === device!.id)!);
  };

  if (phase === 'scan') {
    return (
      <DeviceScan
        onBack={() => go('pick')}
        onDone={(d) => {
          setDevice(d);
          go('coverage');
        }}
      />
    );
  }

  const header = <AppHeader title={de.screens.geraetNeu} onBack={back} />;
  const search = (label: string, placeholder: string) => (
    <TextField
      label={label}
      placeholder={placeholder}
      value={query}
      onChangeText={setQuery}
      autoCorrect={false}
      returnKeyType="search"
      clearButtonMode="while-editing"
    />
  );

  if (phase === 'pick') {
    const found = searchCatalog(query, (c) => de.deviceCategory[c]);
    return (
      <Screen
        header={header}
        footer={
          <ActionBar>
            <Button label={t.scan} size="lg" fullWidth icon="camera" onPress={() => go('scan')} />
            {onSkip ? (
              <Button
                label={de.onboarding.skipDevice}
                variant="secondary"
                fullWidth
                onPress={onSkip}
              />
            ) : null}
          </ActionBar>
        }
      >
        <Text variant="h1" accessibilityRole="header">
          {t.pickTitle}
        </Text>
        <Text variant="body">{t.pickText}</Text>
        {search(t.searchLabel, t.searchPlaceholder)}
        <View style={styles.list}>
          {found.map((m) => (
            <NavRow
              key={m.id}
              title={deviceTitle(m)}
              sub={t.catalogSub(de.deviceCategory[m.category])}
              onPress={() => pickModel(m)}
            />
          ))}
          {found.length === 0 ? (
            <Text variant="body" accessibilityLiveRegion="polite">
              {t.noMatch}
            </Text>
          ) : null}
          <NavRow title={t.manual} tone="muted" onPress={() => go('scan')} />
        </View>
      </Screen>
    );
  }

  if (phase === 'coverage') {
    return (
      <Screen header={header}>
        <Text variant="h1" accessibilityRole="header">
          {t.coverageTitle}
        </Text>
        <Text variant="body">{t.coverageText(device ? deviceTitle(device) : '')}</Text>
        <View style={styles.list}>
          <NavRow title={t.insured} sub={t.insuredSub} onPress={() => go('insurer')} />
          <NavRow title={t.notInsured} sub={t.notInsuredSub} onPress={() => go('dealer')} />
        </View>
      </Screen>
    );
  }

  if (phase === 'insurer') {
    // Der Versicherer aus der Konfiguration steht oben, die Liste ergänzt ihn
    const insurers = [
      demoConfig.insurer,
      ...demoConfig.insurers.filter((i) => i.id !== demoConfig.insurer.id),
    ];
    const found = insurers.filter((i) => matches(query, i.name, i.shortName));
    return (
      <Screen
        header={header}
        footer={
          <ActionBar>
            <Button label={t.savePolicy} size="lg" fullWidth onPress={savePolicy} />
          </ActionBar>
        }
      >
        <Text variant="h1" accessibilityRole="header">
          {t.insurerTitle}
        </Text>
        {search(t.insurerSearch, t.insurerPlaceholder(demoConfig.insurer.shortName))}
        <View style={styles.list} accessibilityRole="radiogroup">
          {found.map((i) => (
            <SelectCard
              key={i.id}
              title={i.name}
              selected={insurerId === i.id}
              onPress={() => {
                setInsurerId(i.id);
                setError(undefined);
              }}
            />
          ))}
          {found.length === 0 ? <Text variant="body">{t.nothingFound}</Text> : null}
        </View>
        <TextField
          label={t.policyLabel}
          hint={t.policyHint}
          placeholder={de.common.example(demoConfig.contract.number)}
          value={policy}
          onChangeText={(v) => {
            setPolicy(v);
            setError(undefined);
          }}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={savePolicy}
        />
        {error ? (
          <Text variant="body" accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
      </Screen>
    );
  }

  const dealers = demoConfig.dealers.filter((d) => matches(query, d.name, d.shortName, d.place));
  return (
    <Screen
      header={header}
      footer={
        <ActionBar>
          <Button label={t.saveDealer} size="lg" fullWidth onPress={saveDealer} />
        </ActionBar>
      }
    >
      <Text variant="h1" accessibilityRole="header">
        {t.dealerTitle}
      </Text>
      <Text variant="body">{t.dealerText}</Text>
      {search(t.dealerSearch, t.dealerPlaceholder(demoConfig.dealers[0]!.place.split(',')[0]!))}
      <View style={styles.list} accessibilityRole="radiogroup">
        {dealers.map((d) => (
          <SelectCard
            key={d.id}
            title={d.name}
            sub={'service' in d && d.service ? t.dealerService(d.place, d.service.name) : d.place}
            selected={dealerId === d.id}
            onPress={() => {
              setDealerId(d.id);
              setError(undefined);
            }}
          />
        ))}
        {dealers.length === 0 ? <Text variant="body">{t.nothingFound}</Text> : null}
        <SelectCard
          title={t.dealerUnknown}
          sub={t.dealerUnknownSub}
          selected={dealerId === UNKNOWN}
          onPress={() => {
            setDealerId(UNKNOWN);
            setError(undefined);
          }}
        />
      </View>
      {error ? (
        <Text variant="body" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
});
