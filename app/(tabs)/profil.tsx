import Constants from 'expo-constants';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import {
  Button,
  Card,
  Checkbox,
  Disclosure,
  FactList,
  NavRow,
  Screen,
  Text,
} from '@/components/ds';
import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';
import { formatDateTime, formatEuro, formatMonthYear } from '@/i18n/format';
import { notifications } from '@/services/notifications';
import { selectContract, useAppStore } from '@/store/appStore';

const t = de.profile;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="title" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

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

      <Section title={t.person}>
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

      <Section title={t.protection}>
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

      <Section title={t.consents}>
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

      <Section title={t.optional}>
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

      <Disclosure title={t.privacy}>
        <Text variant="body">{t.privacyText}</Text>
      </Disclosure>

      <Section title={t.demo}>
        <NavRow title={de.nav.gallery} onPress={() => router.push('/galerie')} />
        <NavRow title={de.nav.restartOnboarding} onPress={() => useAppStore.getState().reset()} />
      </Section>

      <Text variant="caption" align="center">
        {t.version(version)}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10, marginTop: 8 },
  gap: { marginTop: 8 },
});
