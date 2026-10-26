import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CaseScreen, useCaseId } from '@/components/app/CaseScreen';
import {
  ActionBar,
  Button,
  Card,
  ChoiceChip,
  FactList,
  InfoBox,
  PhotoFrame,
  SelectCard,
  Text,
  Toast,
} from '@/components/ds';
import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';
import { formatDecimal, formatEuro } from '@/i18n/format';
import { getManufacturer } from '@/lib/devices';
import { notifications } from '@/services/notifications';
import { useAppStore } from '@/store/appStore';

const t = de.appointment;

/**
 * Betrieb und Termin: Betrieb, Zeitfenster, Adresse und Zusammenfassung vor dem Tap (B-29, B-32).
 * Muss die Nutzerin etwas zahlen, heißt der Button „Zahlungspflichtig buchen“ (§ 312j BGB).
 */
export default function Termin() {
  const caseId = useCaseId();
  const params = useLocalSearchParams<{ art?: string; zahlung?: string }>();
  const diagnosis = params.art === 'diagnose';
  const selfPay = params.zahlung === 'selbst';
  const state = useAppStore();
  const c = state.cases[caseId];
  const quote = state.quotes.find((q) => q.id === c?.quoteId);
  const device = state.devices.find((d) => d.id === c?.deviceId);
  const address = state.household?.address;
  const partners = demoConfig.partners;
  const [partnerId, setPartnerId] = useState(partners[0]?.id);
  const [slot, setSlot] = useState<string>();
  const [toast, setToast] = useState<string>();
  const insurer = demoConfig.insurer.shortName;
  const manufacturer = device ? getManufacturer(device.manufacturerId).name : '';
  const partner = partners.find((p) => p.id === partnerId);
  const claimPending = c?.status === 'freigabe_noetig';

  // Was die Nutzerin selbst zahlt: Selbstbeteiligung oder die ganze Reparatur
  const toPay = diagnosis
    ? 0
    : selfPay
      ? (quote?.repair.total ?? 0)
      : claimPending || c?.claim
        ? state.demo.deductible
        : 0;
  const paid = toPay > 0;

  const costs = diagnosis
    ? t.costsDiagnosis
    : selfPay
      ? t.costsSelf(formatEuro(toPay))
      : t.costsClaim(insurer, formatEuro(state.demo.deductible));

  const request = () => {
    if (!slot || !partnerId) {
      setToast(t.pickSlot);
      return;
    }
    useAppStore.getState().requestBooking({
      caseId,
      kind: diagnosis ? 'vor_ort_diagnose' : 'reparatur',
      partnerId,
      slotLabel: slot,
      selfPay,
      partName: quote?.repair.partName,
    });
    router.replace(`/fall/${caseId}/status`);
    // Systemdialog für Mitteilungen erst jetzt, beim ersten Bedarf (Review 4.1)
    if (useAppStore.getState().notifications === 'offen') {
      notifications
        .requestPermission()
        .then((ok) => useAppStore.getState().setNotifications(ok ? 'erlaubt' : 'abgelehnt'))
        .catch(() => undefined);
    }
  };

  const summary: [string, string][] = [
    [t.facts.partner, partner?.name ?? ''],
    [t.facts.slot, slot ?? '–'],
    [t.facts.address, address ? t.addressLine(address.street, address.zip, address.city) : '–'],
    [t.facts.job, diagnosis ? t.jobDiagnosis : t.jobRepair(quote?.repair.partName ?? '')],
    [t.facts.costs, costs],
  ];

  return (
    <CaseScreen
      title={de.screens.termin}
      footer={
        <>
          {toast ? <Toast message={toast} style={styles.toast} /> : null}
          <ActionBar meta={slot ?? ''} sub={partner?.name}>
            <Button
              label={paid ? t.requestPaid : t.request}
              disabled={!slot}
              onDisabledPress={() => setToast(t.pickSlot)}
              onPress={request}
            />
          </ActionBar>
        </>
      }
    >
      <Text variant="h1" accessibilityRole="header">
        {diagnosis ? t.titleDiagnosis : t.titleRepair}
      </Text>
      {partners.length === 0 ? (
        <Text variant="body">{t.noPartner}</Text>
      ) : (
        <View style={styles.list} accessibilityRole="radiogroup">
          {partners.map((p) => (
            <SelectCard
              key={p.id}
              title={p.name}
              sub={de.common.dot(
                p.authorized ? de.partner.authorized(manufacturer) : de.partner.independent,
                de.partner.distance(formatDecimal(p.distanceKm)),
              )}
              selected={partnerId === p.id}
              onPress={() => setPartnerId(p.id)}
              media={
                <View style={styles.media}>
                  <PhotoFrame label={p.name} ratio={1} compact />
                </View>
              }
            />
          ))}
        </View>
      )}

      <Text variant="title" accessibilityRole="header" style={styles.gap}>
        {t.when}
      </Text>
      <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={t.when}>
        {demoConfig.slots.map((s) => (
          <ChoiceChip
            key={s}
            label={s}
            selected={slot === s}
            onPress={() => {
              setSlot(s);
              setToast(undefined);
            }}
          />
        ))}
      </View>

      <Text variant="title" accessibilityRole="header" style={styles.gap}>
        {t.summary}
      </Text>
      <Card>
        <FactList items={summary} ruled />
      </Card>
      {claimPending ? <InfoBox>{t.pending}</InfoBox> : null}
      {!diagnosis && quote?.repair.partName ? (
        <Text variant="body">
          {t.ecoDesign(de.finding.partName, demoConfig.ecoDesignDeliveryDays)}
        </Text>
      ) : null}
      <Text variant="meta">{t.shares}</Text>
    </CaseScreen>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  media: { width: 72 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gap: { marginTop: 8 },
  toast: { marginHorizontal: 16, marginBottom: 8 },
});
