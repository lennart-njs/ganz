import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CaseScreen, useCaseId } from '@/components/app/CaseScreen';
import { backToThread } from '@/components/nav/leaveCase';
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
import { useCommand } from '@/hooks/useCommand';
import { de } from '@/i18n/de';
import { formatDecimal, formatEuro } from '@/i18n/format';
import { getManufacturer } from '@/lib/devices';
import { caseAppliance } from '@/lib/appliance';
import { amountToPay, asksNotifications, costsLine, requestAppointment } from '@/lib/booking';
import { scopeList } from '@/lib/consent';
import { can, type ActionKey } from '@/model/policies/actions';
import { selectCaseFacts } from '@/model/policies/caseFacts';
import { useAppStore } from '@/store/appStore';

const t = de.appointment;

/**
 * Betrieb und Termin: Betrieb, Zeitfenster, Adresse und Zusammenfassung vor dem Tap (B-29, B-32).
 * Muss die Nutzerin etwas zahlen, heißt der Button „Zahlungspflichtig buchen“ (§ 312j BGB).
 * Ob es den Termin gibt, sagen die Regeln: nach der Ablehnung keiner auf Kosten des Versicherers
 * (R-09), und höchstens einer je Art.
 */
export default function Termin() {
  const caseId = useCaseId();
  const params = useLocalSearchParams<{ art?: string; zahlung?: string }>();
  const diagnosis = params.art === 'diagnose';
  const state = useAppStore();
  const c = state.cases[caseId];
  const facts = selectCaseFacts(state, caseId);
  // Während der Prüfung oder nach der Freigabe zählt ein alter Link mit zahlung=selbst nicht (R-07)
  const selfPay = params.zahlung === 'selbst' && can(facts, 'termin_selbst');
  const action: ActionKey = diagnosis
    ? 'termin_diagnose'
    : selfPay
      ? 'termin_selbst'
      : 'termin_versicherer';
  const quote = state.quotes.find((q) => q.id === c?.quoteId);
  const device = state.devices.find((d) => d.id === c?.deviceId);
  const address = state.household?.address;
  const partners = demoConfig.partners;
  const [partnerId, setPartnerId] = useState(partners[0]?.id);
  const [slot, setSlot] = useState<string>();
  const [toast, setToast] = useState<string>();
  const manufacturer = device ? getManufacturer(device.manufacturerId).name : '';
  const partner = partners.find((p) => p.id === partnerId);
  const claimPending = facts?.claim === 'in_pruefung';

  const paid = amountToPay(state, caseId, selfPay, diagnosis) > 0;
  // Einmal anfragen: Ein zweiter Tap bucht nicht doppelt, eine Ablehnung bekommt einen ruhigen Satz
  const book = useCommand(requestAppointment, () => backToThread(caseId));

  // Ohne Fall kein Formular, nur ein Hinweis (R-18). Zurück und X führen weiter heraus.
  if (!c || !facts) {
    return (
      <CaseScreen title={de.screens.termin}>
        <Text variant="body">{de.result.missing}</Text>
      </CaseScreen>
    );
  }

  // Diesen Termin gibt es nicht: Nach der Ablehnung entscheidest du neu, sonst geht es im Gespräch
  // weiter. Den Preis fürs Selbstzahlen siehst du vor der Wahl.
  if (!can(facts, action)) {
    const rejected = can(facts, 'selbst_zahlen_nach_ablehnung');
    return (
      <CaseScreen
        title={de.screens.termin}
        footer={
          <ActionBar>
            {rejected && facts.quote ? (
              <Button
                label={de.costs.rejectedSelfPay(formatEuro(facts.quote.repair.total))}
                size="lg"
                fullWidth
                onPress={() => router.setParams({ zahlung: 'selbst' })}
              />
            ) : null}
            <Button
              label={de.thread.toThread}
              variant={rejected ? 'secondary' : 'primary'}
              size={rejected ? 'md' : 'lg'}
              fullWidth
              onPress={() => backToThread(caseId)}
            />
          </ActionBar>
        }
      >
        <Text variant="h1" accessibilityRole="header">
          {rejected ? de.costs.rejectedTitle(demoConfig.insurer.shortName) : t.unavailableTitle}
        </Text>
        <Text variant="bodyLg">{rejected ? de.costs.rejectedText : t.unavailableText}</Text>
      </CaseScreen>
    );
  }

  const request = () => {
    if (!slot || !partnerId) {
      setToast(t.pickSlot);
      return;
    }
    book.run({ caseId, partnerId, slot, selfPay, diagnosis });
  };
  const notice = book.toast ?? toast;

  const summary: [string, string][] = [
    [t.facts.partner, partner?.name ?? ''],
    [t.facts.slot, slot ?? '–'],
    [t.facts.address, address ? t.addressLine(address.street, address.zip, address.city) : '–'],
    [t.facts.job, diagnosis ? t.jobDiagnosis : t.jobRepair(quote?.repair.partName ?? '')],
    [t.facts.costs, costsLine(state, caseId, selfPay, diagnosis)],
  ];

  return (
    <CaseScreen
      title={de.screens.termin}
      footer={
        <>
          {notice ? <Toast message={notice} style={styles.toast} /> : null}
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
          {t.ecoDesign(
            caseAppliance(state, caseId).finding.partAcc,
            demoConfig.ecoDesignDeliveryDays,
          )}
        </Text>
      ) : null}
      {/* Dieselben Kategorien speichert die Bestätigung mit der Anfrage (R-14) */}
      <Text variant="meta">{t.shares(scopeList('weitergabe_betrieb'))}</Text>
      {/* Danach fragt das System nach Mitteilungen. Die Einwilligung speichert diesen Satz. */}
      {asksNotifications(state) ? <Text variant="meta">{t.notificationsNotice}</Text> : null}
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
