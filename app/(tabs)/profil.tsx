import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet } from 'react-native';

import { DemoControlSheet } from '@/components/app/DemoControlSheet';
import { DemoHint } from '@/components/app/DemoHint';
import {
  Button,
  Card,
  Checkbox,
  Section,
  FactList,
  NavRow,
  Screen,
  SegmentedControl,
  Text,
} from '@/components/ds';
import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';
import { formatDateTime, formatEuro, formatMonthYear } from '@/i18n/format';
import { notifications } from '@/services/notifications';
import { selectContract, useAppStore, type Appearance } from '@/store/appStore';

const t = de.profile;

/** Profil: Person, Schutz, Weitergaben mit Widerruf (B-40), Datenschutz, Version */
export default function Profil() {
  const state = useAppStore();
  const person = state.persons[0];
  const address = state.household?.address;
  const contract = selectContract(state);
  const consents = [...state.consents].sort((a, b) => b.grantedAt.localeCompare(a.grantedAt));
  const manufacturerConsent = consents.find(
    (c) => c.purpose === 'hersteller_einzelfall' && !c.revokedAt,
  );
  const caseConsents = consents.filter((c) => c.purpose !== 'hersteller_einzelfall');
  const version = Constants.expoConfig?.version ?? '';
  const [demoOpen, setDemoOpen] = useState(false);
  const taps = useRef<number[]>([]);

  const tapVersion = () => {
    if (!demoConfig.demo.enabled) return;
    const now = Date.now();
    // Sieben Taps innerhalb von 3 Sekunden
    taps.current = [...taps.current.filter((x) => now - x < 3000), now];
    if (taps.current.length >= 7) {
      taps.current = [];
      setDemoOpen(true);
    }
  };

  const toggleManufacturer = (on: boolean) => {
    const s = useAppStore.getState();
    if (on) {
      s.grantConsent({
        purpose: 'hersteller_einzelfall',
        legalBasis: 'einwilligung',
        recipient: {
          id: demoConfig.manufacturer.id,
          kind: 'hersteller',
          name: demoConfig.manufacturer.name,
        },
        dataCategories: [t.manufacturerCase(demoConfig.manufacturer.name)],
        textVersion: '2026-10-1',
      });
    } else if (manufacturerConsent) {
      s.revokeConsent(manufacturerConsent.id);
    }
  };

  const toggleNotifications = async (on: boolean) => {
    const s = useAppStore.getState();
    if (!on) {
      s.setNotifications('abgelehnt');
      return;
    }
    const ok = await notifications.requestPermission();
    if (ok) s.setNotifications('erlaubt');
    else Linking.openSettings();
  };

  return (
    <Screen>
      <Text variant="h1" accessibilityRole="header">
        {de.screens.profil}
      </Text>
      <DemoHint id="profil" />

      <Section title={t.person} summary={person?.displayName}>
        <Card>
          <FactList
            items={[
              [t.name, person?.displayName ?? ''],
              ...(address
                ? ([
                    [
                      t.address,
                      de.appointment.addressLine(address.street, address.zip, address.city),
                    ],
                  ] as [string, string][])
                : []),
            ]}
          />
        </Card>
      </Section>

      <Section
        title={t.protection}
        summary={contract ? contract.provider.name : de.device.noProtection}
      >
        {contract ? (
          <Card>
            <FactList
              items={[
                [de.device.protectionFacts.product, contract.productName],
                [de.device.protectionFacts.provider, contract.provider.name],
                [de.device.protectionFacts.validUntil, formatMonthYear(contract.validUntil)],
                [de.device.protectionFacts.deductible, formatEuro(state.demo.deductible)],
                [de.device.protectionFacts.number, contract.contractNumber],
              ]}
            />
          </Card>
        ) : (
          <NavRow title={t.linkProtection} onPress={() => router.push('/schutz-verknuepfen')} />
        )}
      </Section>

      <Section
        title={t.consents}
        summary={t.consentsCount(caseConsents.filter((c) => !c.revokedAt).length)}
      >
        <Text variant="body">{t.consentsText}</Text>
        {caseConsents.length === 0 ? <Text variant="meta">{t.noConsents}</Text> : null}
        {caseConsents.map((c) => (
          <Card key={c.id} padding={16}>
            <Text variant="labelStrong">{de.consentPurpose[c.purpose]}</Text>
            <Text variant="meta">
              {t.consentLine(c.recipient.name, t.basis[c.legalBasis], formatDateTime(c.grantedAt))}
            </Text>
            {c.revokedAt ? (
              <Text variant="meta" tone="strong" style={styles.gap}>
                {t.revokedOn(formatDateTime(c.revokedAt))}
              </Text>
            ) : (
              <Button
                label={t.revoke}
                variant="link"
                accessibilityHint={t.revokeLabel(de.consentPurpose[c.purpose], c.recipient.name)}
                onPress={() => useAppStore.getState().revokeConsent(c.id)}
              />
            )}
          </Card>
        ))}
      </Section>

      <Section
        title={t.optional}
        summary={t.optionalCount(
          [!!manufacturerConsent, state.notifications === 'erlaubt'].filter(Boolean).length,
        )}
      >
        <Checkbox
          label={t.manufacturerCase(demoConfig.manufacturer.name)}
          sub={t.manufacturerCaseSub}
          checked={!!manufacturerConsent}
          onChange={toggleManufacturer}
        />
        <Checkbox
          label={t.notifications}
          sub={state.notifications === 'abgelehnt' ? t.notificationsDenied : t.notificationsSub}
          checked={state.notifications === 'erlaubt'}
          onChange={toggleNotifications}
        />
      </Section>

      <Section title={t.appearance} summary={t.appearanceOptions[state.appearance]}>
        <SegmentedControl
          accessibilityLabel={t.appearance}
          options={(['system', 'hell', 'dunkel'] as Appearance[]).map((value) => ({
            value,
            label: t.appearanceOptions[value],
          }))}
          value={state.appearance}
          onChange={(v) => useAppStore.getState().setAppearance(v)}
        />
      </Section>

      <Section title={t.privacy}>
        <Text variant="body">{t.privacyText}</Text>
      </Section>

      {/* Versteckte Geste: 7-mal tippen öffnet die Demo-Steuerung (Review 3, Punkt 13) */}
      <Pressable
        onPress={tapVersion}
        accessibilityRole="text"
        accessibilityLabel={t.version(version)}
        style={styles.version}
      >
        <Text variant="caption" align="center">
          {t.version(version)}
        </Text>
      </Pressable>
      {demoConfig.demo.enabled ? (
        <DemoControlSheet visible={demoOpen} onClose={() => setDemoOpen(false)} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { marginTop: 8 },
  version: { minHeight: 44, justifyContent: 'center' },
});
