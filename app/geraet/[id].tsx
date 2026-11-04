import { router, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

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
  Toast,
} from '@/components/ds';
import { GUIDE_SOURCE } from '@/data/guides';
import { useNotice } from '@/hooks/useNotice';
import { de } from '@/i18n/de';
import { formatDateTime, formatEuro, formatMonthYear } from '@/i18n/format';
import { hasGuides } from '@/lib/appliance';
import { caseProgressLabel, caseStatusLabel, deviceStatusLabel, resumeHref } from '@/lib/caseView';
import { deviceTitle, getManufacturer } from '@/lib/devices';
import { openPhone } from '@/lib/linking';
import { isClosed } from '@/model/caseMachine';
import { findOpenCase } from '@/model/policies/openCase';
import { selectDevice, useAppStore } from '@/store/appStore';

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
  // Lässt sich die Telefon-App nicht öffnen, steht die Nummer im Hinweis
  const phoneNotice = useNotice();
  const call = (phone: string) =>
    openPhone(phone).then((ok) => ok || phoneNotice.show(de.common.phoneFailed(phone)));

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
  const openCase = findOpenCase(state, device.id);
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
        <>
          {phoneNotice.notice ? <Toast message={phoneNotice.notice} style={styles.toast} /> : null}
          <ActionBar meta={deviceStatusLabel(state, device.id)} sub={title}>
            <Button label={t.reportProblem} onPress={report} />
          </ActionBar>
        </>
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

      {hasGuides(device.category) ? (
        <Section title={t.sections.maintenance}>
          {de.maintenance.map((m) => (
            <NavRow
              key={m.guideId}
              title={m.title}
              sub={m.sub}
              onPress={() => {
                // Ein offener Fall pro Gerät (Entscheidung Nr. 13): Mit Fortschritt fragt
                // „Problem melden“ zuerst, ob du dort weitermachen willst.
                const st = useAppStore.getState();
                const r = st.openCaseFor(device.id, 'pflege', m.title, { guideId: m.guideId });
                if (!r.ok) return;
                if (r.value.art === 'frage_weitermachen') {
                  router.push({
                    pathname: '/fall/neu',
                    params: { geraet: device.id, pflege: m.guideId },
                  });
                  return;
                }
                const id = r.value.caseId;
                if (st.startGuide(id, m.guideId).ok) router.push(`/fall/${id}?weiter=anleitung`);
              }}
            />
          ))}
        </Section>
      ) : null}

      <Section title={t.sections.guides}>
        {hasGuides(device.category) ? (
          <Text variant="meta">{t.guideSource(GUIDE_SOURCE)}</Text>
        ) : (
          <Text variant="meta">{t.noGuides}</Text>
        )}
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
              onPress={() => {
                if (isClosed(c.status)) {
                  router.push(`/fall/${c.id}/fallakte`);
                  return;
                }
                // Wie die Karte „Offener Fall“: weitermachen setzt eine Pause fort
                if (c.pausedAt) state.resumeCase(c.id);
                router.push(resumeHref(state, c));
              }}
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
            onPress={() => call(service.phone)}
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
  toast: { marginHorizontal: 16, marginBottom: 8 },
});
