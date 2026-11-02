import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ActionBar, AppHeader, Button, Screen, SelectCard, Text } from '@/components/ds';
import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';
import type { PartnerRef } from '@/model/types';
import { useAppStore } from '@/store/appStore';

const t = de.onboarding;

const dealers: PartnerRef[] = [demoConfig.dealer, ...demoConfig.otherDealers].map((d) => ({
  id: d.id,
  kind: 'haendler',
  name: d.name,
}));

/** Onboarding: zuerst der Händler (Entscheidung 22), danach eine zusätzliche Versicherung. */
export default function Haendler() {
  const setDealer = useAppStore((s) => s.setOnboardingDealer);
  const [choice, setChoice] = useState<string | undefined>(
    () => useAppStore.getState().onboardingDealer?.id,
  );

  const next = () => {
    setDealer(dealers.find((d) => d.id === choice));
    router.push('/schutz');
  };

  return (
    <Screen
      header={<AppHeader title={de.screens.haendler} onBack={() => router.back()} />}
      footer={
        <ActionBar>
          <Button label={t.next} size="lg" fullWidth disabled={!choice} onPress={next} />
        </ActionBar>
      }
    >
      <Text variant="h1" accessibilityRole="header">
        {t.dealerTitle}
      </Text>
      <Text variant="body">{t.dealerText}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={t.dealerChoices} style={styles.list}>
        {dealers.map((d) => (
          <SelectCard
            key={d.id}
            title={d.name}
            selected={choice === d.id}
            onPress={() => setChoice(d.id)}
          />
        ))}
        <SelectCard
          title={t.dealerOther}
          sub={t.dealerOtherSub}
          selected={choice === 'woanders'}
          onPress={() => setChoice('woanders')}
        />
        <SelectCard
          title={t.dealerUnknown}
          selected={choice === 'unbekannt'}
          onPress={() => setChoice('unbekannt')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ list: { gap: 12 } });
