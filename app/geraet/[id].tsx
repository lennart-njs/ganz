import { router, useLocalSearchParams } from 'expo-router';
import { Linking } from 'react-native';

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
  Section,
  Text,
} from '@/components/ds';
import { de } from '@/i18n/de';
import { formatDateTime, formatEuro, formatMonthYear } from '@/i18n/format';
import { deviceGuides } from '@/lib/appliance';
import { caseProgressLabel, caseStatusLabel, deviceStatusLabel, resumeHref } from '@/lib/caseView';
import { deviceTitle, getManufacturer } from '@/lib/devices';
import { dealerService } from '@/lib/service';
import { selectDevice, selectOpenCaseForDevice, useAppStore } from '@/store/appStore';

const t = de.device;

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
  const guideSet = deviceGuides(device);

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
        <ActionBar>
          <Button label={t.reportProblem} onPress={report} />
        </ActionBar>
      }
    >
      <PhotoFrame label={title} ratio={4 / 3} />
      <Text variant="h1" accessibilityRole="header">
        {title}
      </Text>

      <Section
        title={t.sections.status}
        summary={
          openCase
            ? de.common.dot(openCase.problemLabel, caseProgressLabel(state, openCase))
            : deviceStatusLabel(state, device.id)
        }
      >
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

      <Section
        title={t.sections.protection}
        summary={
          contract
            ? de.common.dot(contract.productName, contract.provider.name)
            : de.common.dot(de.coverage.dealer, device.soldBy?.name ?? de.coverage.dealerUnknown)
        }
      >
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
            <Card>
              <FactList
                items={[[de.coverage.dealer, device.soldBy?.name ?? de.coverage.dealerUnknown]]}
              />
            </Card>
          </>
        )}
        <NavRow
          title={de.coverage.change}
          onPress={() => router.push(`/schutz-verknuepfen?geraet=${device.id}`)}
        />
      </Section>

      {guideSet?.care ? (
        <Section title={t.sections.maintenance} summary={t.count(de.maintenance.length)}>
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
                router.push(`/fall/${c.id}`);
              }}
            />
          ))}
        </Section>
      ) : null}

      <Section
        title={t.sections.guides}
        summary={guideSet ? t.count(guideSet.problems.length) : t.noGuides}
      >
        {guideSet ? (
          <>
            {guideSet.problems.map((p) => (
              <NavRow key={p.id} title={p.label} sub={p.sub} onPress={report} />
            ))}
            <Text variant="meta">{t.guideSource(guideSet.source)}</Text>
          </>
        ) : (
          <Text variant="body">{t.noGuides}</Text>
        )}
      </Section>

      <Section
        title={t.sections.cases}
        summary={cases.length ? t.casesCount(cases.length) : t.noCases}
      >
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

      {/* Mit Händler-Kundendienst keine Hotline des Herstellers (wie im Fall) */}
      {service && !dealerService(device) ? (
        <Section title={t.sections.service} summary={service.label}>
          {/* Nummer aus den Gerätedaten (B-21). Öffnet die Telefon-App. */}
          <NavRow
            title={service.label}
            sub={t.serviceSub(service.phone, service.freeOfCharge)}
            accessibilityHint={de.common.phoneHint}
            onPress={() => Linking.openURL(`tel:${service.phone.replace(/\s/g, '')}`)}
          />
        </Section>
      ) : null}

      <Section
        title={t.sections.device}
        summary={de.common.dot(de.deviceCategory[device.category], device.model)}
      >
        <Card>
          <FactList items={deviceFacts} />
        </Card>
      </Section>
    </Screen>
  );
}
