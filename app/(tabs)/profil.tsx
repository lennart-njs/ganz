import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';

import { AssistantConsentText } from '@/components/app/AssistantConsent';
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
  Toast,
} from '@/components/ds';
import { demoConfig } from '@/config/demo.config';
import { useNotice } from '@/hooks/useNotice';
import { de } from '@/i18n/de';
import { formatDateTime, formatEuro, formatMonthYear } from '@/i18n/format';
import { hasChatConsent } from '@/lib/chat/context';
import { grantAssistantConsent } from '@/lib/chat/useAssistant';
import { categoryLabels, scopeList } from '@/lib/consent';
import { PRIVACY_RECIPIENTS, textStamp } from '@/lib/legalTexts';
import { openSystemSettings } from '@/lib/linking';
import { scopedConsent } from '@/model/policies/consentScopes';
import { notifications } from '@/services/notifications';
import { notificationsOn, selectContract, useAppStore, type Appearance } from '@/store/appStore';

const t = de.profile;

/**
 * Profil: Person, Schutz, Weitergaben mit Widerruf (B-40), Freiwilliges, Datenschutz, Version.
 * Hier stehen die Texte zu Weitergaben und Einwilligungen, im Gespräch nur noch der Tap
 * (Entscheidung 38).
 */
export default function Profil() {
  const state = useAppStore();
  const person = state.persons[0];
  const address = state.household?.address;
  const contract = selectContract(state);
  const consents = [...state.consents].sort((a, b) => b.grantedAt.localeCompare(a.grantedAt));
  const manufacturerConsent = consents.find(
    (c) => c.purpose === 'hersteller_einzelfall' && !c.revokedAt,
  );
  // Assistent, Hersteller und Mitteilungen haben eigene Schalter unter „Freiwillig“
  const caseConsents = consents.filter(
    (c) =>
      c.purpose !== 'chat_assistent' &&
      c.purpose !== 'hersteller_einzelfall' &&
      c.purpose !== 'mitteilungen',
  );
  const assistantOn = hasChatConsent(state);
  const version = Constants.expoConfig?.version ?? '';
  const [demoOpen, setDemoOpen] = useState(false);
  const taps = useRef<number[]>([]);
  const settingsNotice = useNotice();

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

  // Einschalten speichert die Einwilligung mit dem Text darunter, Ausschalten widerruft jede aktive
  const toggleAssistant = (on: boolean) => {
    if (on) {
      grantAssistantConsent();
      return;
    }
    const s = useAppStore.getState();
    for (const c of s.consents) {
      if (c.purpose === 'chat_assistent' && !c.revokedAt) s.revokeConsent(c.id);
    }
  };

  const toggleManufacturer = (on: boolean) => {
    const s = useAppStore.getState();
    if (on) {
      s.grantConsent(
        scopedConsent('hersteller_einzelfall', {
          recipient: {
            id: demoConfig.manufacturer.id,
            kind: 'hersteller',
            name: demoConfig.manufacturer.name,
          },
          text: textStamp('hersteller_einzelfall'),
        }),
      );
    } else if (manufacturerConsent) {
      s.revokeConsent(manufacturerConsent.id);
    }
  };

  // Einschalten speichert die Einwilligung, Ausschalten widerruft sie (im Store, R-13). Hat das
  // Telefon Mitteilungen ausgeschaltet, geht es in die Einstellungen. Im Web gibt es sie nicht,
  // dann bleibt ein ruhiger Hinweis.
  const toggleNotifications = async (on: boolean) => {
    const s = useAppStore.getState();
    if (!on) {
      s.setNotifications('abgelehnt');
      return;
    }
    // Die Einwilligung ist der Tap auf das Kästchen mit seinem Text, mit oder ohne Systemdialog
    const { granted } = await notifications.requestPermission();
    if (granted) {
      s.setNotifications('erlaubt');
      return;
    }
    if (Platform.OS === 'web') settingsNotice.show(t.notificationsWeb);
    else if (!(await openSystemSettings())) settingsNotice.show(t.notificationsSettings);
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
        {caseConsents.length === 0 ? <Text variant="meta">{t.noConsents}</Text> : null}
        {caseConsents.map((c) => (
          <Card key={c.id} padding={16}>
            <Text variant="labelStrong">{de.consentPurpose[c.purpose]}</Text>
            <Text variant="meta">
              {t.consentLine(c.recipient.name, t.basis[c.legalBasis], formatDateTime(c.grantedAt))}
            </Text>
            {/* Welche Daten, so wie die Bestätigung sie gespeichert hat */}
            {c.dataCategories.length ? (
              <Text variant="meta">{de.common.list(categoryLabels(c.dataCategories))}</Text>
            ) : null}
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
          [assistantOn, !!manufacturerConsent, notificationsOn(state)].filter(Boolean).length,
        )}
      >
        <Checkbox label={de.chat.consentTitle} checked={assistantOn} onChange={toggleAssistant} />
        <AssistantConsentText />
        <Checkbox
          label={t.manufacturerCase(demoConfig.manufacturer.name)}
          sub={t.manufacturerCaseSub(scopeList('hersteller_einzelfall'))}
          checked={!!manufacturerConsent}
          onChange={toggleManufacturer}
        />
        <Checkbox
          label={t.notifications}
          sub={t.notificationsSub}
          checked={notificationsOn(state)}
          onChange={toggleNotifications}
        />
        {settingsNotice.notice ? <Toast message={settingsNotice.notice} /> : null}
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
        <Text variant="labelStrong" accessibilityRole="header">
          {t.privacyWho}
        </Text>
        {PRIVACY_RECIPIENTS.map(([who, purpose]) => (
          <Text key={who} variant="body">
            {t.privacyRecipient(t.recipients[who], scopeList(purpose))}
          </Text>
        ))}
        <Text variant="meta">{t.privacyShareBasis}</Text>
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
