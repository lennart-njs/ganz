import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { DemoHint } from '@/components/app/DemoHint';
import { CaseFileCard } from '@/components/app/CaseFileCard';
import { CaseScreen, useCaseId } from '@/components/app/CaseScreen';
import {
  ActionBar,
  Button,
  Card,
  Checkbox,
  InfoBox,
  NavRow,
  PhotoFrame,
  Text,
} from '@/components/ds';
import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';
import { formatEuro } from '@/i18n/format';
import { getManufacturer } from '@/lib/devices';
import { useAppStore } from '@/store/appStore';

const t = de.help;
const CONSENT_TEXT_VERSION = '2026-10-1';

/**
 * Hilfe holen: Videocall als Hauptaktion (B-20), vorher steht, wer welche Daten sieht (B-19).
 * Kein Schadenfall, keine Kostenzusage (B-17, B-18).
 */
export default function Hilfe() {
  const caseId = useCaseId();
  const state = useAppStore();
  const c = state.cases[caseId];
  const device = state.devices.find((d) => d.id === c?.deviceId);
  const contract = state.contracts.find((k) => k.id === device?.contractId);
  const partner = demoConfig.partners.find((p) => p.id === demoConfig.expert.partnerId)!;
  const service = device ? getManufacturer(device.manufacturerId).serviceContact : undefined;
  const [screenshots, setScreenshots] = useState(false);

  const startCall = () => {
    const s = useAppStore.getState();
    s.escalate(caseId);
    const recipient = { id: partner.id, kind: 'betrieb' as const, name: partner.name };
    s.grantConsent({
      caseId,
      purpose: 'weitergabe_fachkraft',
      legalBasis: 'vertrag',
      recipient,
      dataCategories: [...t.shareItems],
      textVersion: CONSENT_TEXT_VERSION,
    });
    const shot = screenshots
      ? s.grantConsent({
          caseId,
          purpose: 'screenshots_im_call',
          legalBasis: 'einwilligung',
          recipient,
          dataCategories: [t.screenshots],
          textVersion: CONSENT_TEXT_VERSION,
        })
      : undefined;
    const session = s.requestVideoCall(caseId, shot?.id);
    router.push(`/fall/${caseId}/warteraum?video=${session.id}`);
  };

  const onSite = () => {
    useAppStore.getState().escalate(caseId);
    router.push(`/fall/${caseId}/termin?art=diagnose`);
  };

  return (
    <CaseScreen
      title={de.screens.hilfe}
      footer={
        <ActionBar meta={t.callMeta} sub={t.callSub}>
          <Button label={t.startCall} icon="video" onPress={startCall} />
        </ActionBar>
      }
    >
      <DemoHint id="hilfe" />
      <PhotoFrame label={t.photo} />
      <Text variant="h1" accessibilityRole="header">
        {t.title}
      </Text>
      <Text variant="bodyLg">{t.text}</Text>
      <InfoBox>
        {contract
          ? t.costNote(demoConfig.insurer.shortName, formatEuro(state.demo.deductible))
          : t.costNoteNoContract}
      </InfoBox>

      <CaseFileCard caseId={caseId} />

      <Card>
        <Text variant="labelStrong" accessibilityRole="header">
          {t.shareTitle(demoConfig.expert.name, partner.name)}
        </Text>
        <View style={styles.items}>
          {t.shareItems.map((item) => (
            <Text key={item} variant="body">
              {t.item(item)}
            </Text>
          ))}
        </View>
        <Text variant="labelStrong" style={styles.gap}>
          {t.noRecording}
        </Text>
        <Text variant="meta" style={styles.gap}>
          {t.legalBasis}
        </Text>
      </Card>
      <Checkbox
        label={t.screenshots}
        sub={t.screenshotsSub}
        checked={screenshots}
        onChange={setScreenshots}
      />

      <Text variant="title" accessibilityRole="header" style={styles.gap}>
        {t.others}
      </Text>
      <NavRow title={t.onSite} sub={t.onSiteSub} onPress={onSite} />
      <NavRow
        title={de.chat.entry}
        sub={de.chat.entrySub}
        onPress={() => router.push(`/fall/${caseId}/chat`)}
      />
      {service ? (
        <NavRow
          title={service.label}
          sub={de.device.serviceSub(service.phone, service.freeOfCharge)}
          accessibilityHint={de.common.phoneHint}
          onPress={() => Linking.openURL(`tel:${service.phone.replace(/\s/g, '')}`)}
        />
      ) : null}
    </CaseScreen>
  );
}

const styles = StyleSheet.create({
  items: { marginTop: 8, gap: 2 },
  gap: { marginTop: 8 },
});
