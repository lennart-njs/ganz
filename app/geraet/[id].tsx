import { router, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { OpenCaseCard } from '@/components/app/OpenCaseCard';
import {
  ActionBar,
  AppHeader,
  Button,
  Card,
  FactList,
  NavRow,
  PhotoFrame,
  Screen,
  Text,
} from '@/components/ds';
import { GUIDE_SOURCE } from '@/data/guides';
import { de } from '@/i18n/de';
import { formatDateTime, formatEuro, formatMonthYear } from '@/i18n/format';
import { caseProgressLabel, caseStatusLabel, deviceStatusLabel, resumeHref } from '@/lib/caseView';
import { deviceTitle, getManufacturer } from '@/lib/devices';
import { selectDevice, selectOpenCaseForDevice, useAppStore } from '@/store/appStore';

const t = de.device;

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

export default function GeraetDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const state = useAppStore();
  const device = selectDevice(state, id);

  if (!device) {
    return (
      <Screen header={<AppHeader onBack={() => router.back()} />}>
        <Text variant="body">{t.notFound}</Text>
      </Screen>
    );
  }

  const title = deviceTitle(device);
  const manufacturer = getManufacturer(device.manufacturerId);
  const contract = state.contracts.find((c) => c.id === device.contractId);
  const openCase = selectOpenCaseForDevice(state, device.id);
  const cases = Object.values(state.cases)
    .filter((c) => c.deviceId === device.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const report = () => router.push(`/fall/neu?geraet=${device.id}`);
  const service = manufacturer.serviceContact;

  const deviceFacts = [
    [t.deviceFacts.manufacturer, manufacturer.name],
    [t.deviceFacts.model, device.model],
    [t.deviceFacts.category, de.deviceCategory[device.category]],
    ...(device.materialNumber ? [[t.deviceFacts.materialNumber, device.materialNumber]] : []),
    ...(device.serialNumber ? [[t.deviceFacts.serialNumber, device.serialNumber]] : []),
    ...(device.purchaseDate
      ? [[t.deviceFacts.purchased, formatMonthYear(device.purchaseDate)]]
      : []),
  ] as [string, string][];

  return (
    <Screen
      header={<AppHeader title={title} onBack={() => router.back()} />}
      footer={
        <ActionBar meta={deviceStatusLabel(state, device.id)} sub={title}>
          <Button label={t.reportProblem} onPress={report} />
        </ActionBar>
      }
    >
      <PhotoFrame label={title} ratio={4 / 3} />
      <Text variant="h1" accessibilityRole="header">
        {title}
      </Text>

      <Section title={t.sections.status}>
        {openCase ? (
          <OpenCaseCard
            caseId={openCase.id}
            title={openCase.problemLabel}
            detail={caseProgressLabel(state, openCase)}
            onContinue={() => {
              if (openCase.pausedAt) state.resumeCase(openCase.id);
              router.push(resumeHref(state, openCase));
            }}
          />
        ) : (
          <Text variant="body">{deviceStatusLabel(state, device.id)}</Text>
        )}
      </Section>

      <Section title={t.sections.protection}>
        {contract ? (
          <Card>
            <FactList
              items={[
                [t.protectionFacts.product, contract.productName],
                [t.protectionFacts.provider, contract.provider.name],
                [t.protectionFacts.validUntil, formatMonthYear(contract.validUntil)],
                [t.protectionFacts.deductible, formatEuro(state.demo.deductible)],
                [t.protectionFacts.number, contract.contractNumber],
              ]}
            />
          </Card>
        ) : (
          <>
            <Text variant="labelStrong">{t.noProtection}</Text>
            <Text variant="body">{t.noProtectionText}</Text>
            <NavRow title={de.onboarding.link} onPress={() => router.push('/schutz-verknuepfen')} />
          </>
        )}
      </Section>

      <Section title={t.sections.maintenance}>
        {de.maintenance.map((m) => (
          <NavRow
            key={m.guideId}
            title={m.title}
            sub={m.sub}
            onPress={() => {
              const st = useAppStore.getState();
              const c = st.createCase({
                deviceId: device.id,
                entry: 'pflege',
                problemLabel: m.title,
              });
              st.startGuide(c.id, m.guideId);
              router.push(`/fall/${c.id}/anleitung`);
            }}
          />
        ))}
      </Section>

      <Section title={t.sections.guides}>
        <Text variant="meta">{t.guideSource(GUIDE_SOURCE)}</Text>
        <NavRow title={t.reportProblem} sub={de.home.searchSub} onPress={report} />
      </Section>

      <Section title={t.sections.cases}>
        {cases.length === 0 ? (
          <Text variant="body">{t.noCases}</Text>
        ) : (
          cases.map((c) => (
            <NavRow
              key={c.id}
              title={c.problemLabel}
              sub={de.common.dot(caseStatusLabel(c.status), formatDateTime(c.createdAt))}
              onPress={() =>
                router.push(
                  c.status === 'erledigt' || c.status === 'abgebrochen'
                    ? `/fall/${c.id}/fallakte`
                    : resumeHref(state, c),
                )
              }
            />
          ))
        )}
      </Section>

      {service ? (
        <Section title={t.sections.service}>
          {/* Nummer aus den Gerätedaten (B-21). Öffnet die Telefon-App. */}
          <NavRow
            title={service.label}
            sub={t.serviceSub(service.phone, service.freeOfCharge)}
            accessibilityHint={de.common.phoneHint}
            onPress={() => Linking.openURL(`tel:${service.phone.replace(/\s/g, '')}`)}
          />
        </Section>
      ) : null}

      <Section title={t.sections.device}>
        <Card>
          <FactList items={deviceFacts} />
        </Card>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10, marginTop: 8 },
});
