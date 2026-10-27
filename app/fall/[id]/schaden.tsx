import { Redirect, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { KeyboardAwareScrollViewRef } from 'react-native-keyboard-controller';

import { CaseFileCard } from '@/components/app/CaseFileCard';
import { CaseScreen, useCaseId } from '@/components/app/CaseScreen';
import { BotSays, QuickReplies, UserSaid, type Reply } from '@/components/app/Conversation';
import { CostCompare } from '@/components/app/CostCompare';
import { Card, Disclosure, FactList, InfoBox, Text } from '@/components/ds';
import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';
import { formatDecimal, formatEuro } from '@/i18n/format';
import { caseAppliance } from '@/lib/appliance';
import { amountToPay, costsLine, requestAppointment } from '@/lib/booking';
import { latestDiagnosis } from '@/lib/caseView';
import { getManufacturer } from '@/lib/devices';
import { useAppStore } from '@/store/appStore';

const g = de.talk.claim;
const CLAIM_TEXT_VERSION = '2026-10-1';

type Step = 'melden' | 'betrieb' | 'zeit' | 'fertig';

/**
 * Schadenmeldung und Termin als Gespräch, als zweiter Weg neben dem Formular (Entscheidung 9).
 * Gleiche Regeln: Vorschau, was an den Versicherer geht, Schadenfall nur durch den Tap (B-17),
 * keine Kostenzusage (B-18), „Zahlungspflichtig buchen“, wenn etwas zu zahlen ist.
 */
export default function SchadenGespraech() {
  const caseId = useCaseId();
  const state = useAppStore();
  const c = state.cases[caseId];
  const quote = state.quotes.find((q) => q.id === c?.quoteId);
  const device = state.devices.find((d) => d.id === c?.deviceId);
  const contract = state.contracts.find((k) => k.id === device?.contractId);
  const finding = c
    ? (latestDiagnosis(state, c, 'fachkraft') ?? latestDiagnosis(state, c, 'betrieb'))
    : undefined;
  const insurer = demoConfig.insurer.shortName;
  const address = state.household?.address;
  const partners = demoConfig.partners;
  const manufacturer = device ? getManufacturer(device.manufacturerId).name : '';

  const reported = !!c?.claim;
  const [selfPay, setSelfPay] = useState(false);
  const [step, setStep] = useState<Step>(reported ? 'betrieb' : 'melden');
  const [partnerId, setPartnerId] = useState<string>();
  const [slot, setSlot] = useState<string>();
  const scrollRef = useRef<KeyboardAwareScrollViewRef>(null);

  useEffect(() => {
    const id = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(id);
  }, [step]);

  // Nur der übliche Weg läuft als Gespräch. Ablehnung, Ersatzgerät und gebuchte Termine zeigt das Formular.
  const booked = state.bookings.some((b) => b.caseId === caseId && b.status !== 'storniert');
  if (
    !c ||
    !quote ||
    booked ||
    c.status === 'abgelehnt' ||
    finding?.errorPattern === 'ersatzgeraet_noetig'
  ) {
    return <Redirect href={`/fall/${caseId}/kosten`} />;
  }

  const toForm = () =>
    router.canGoBack() ? router.back() : router.replace(`/fall/${caseId}/kosten`);
  const partner = partners.find((p) => p.id === partnerId);
  const paid = amountToPay(state, caseId, selfPay) > 0;

  // ---------- Antworten ----------

  const pickClaim = (key: string) => {
    if (key === 'formular') return toForm();
    if (key === 'melden') {
      // Der Schadenfall entsteht genau hier, durch den Tap (B-17)
      useAppStore.getState().reportClaim(caseId, CLAIM_TEXT_VERSION);
      setSelfPay(false);
    } else {
      setSelfPay(true);
    }
    setStep('betrieb');
  };

  const pickPartner = (key: string) => {
    setPartnerId(key);
    setStep('zeit');
  };

  const pickSlot = (key: string) => {
    setSlot(key);
    setStep('fertig');
  };

  const pickFinish = (key: string) => {
    if (key === 'formular') return toForm();
    if (!partnerId || !slot) return;
    requestAppointment({ caseId, partnerId, slot, selfPay });
    router.replace(`/fall/${caseId}/status`);
  };

  // ---------- Ändern ----------

  const editPayment = () => {
    setPartnerId(undefined);
    setSlot(undefined);
    setStep('melden');
  };
  const editPartner = () => {
    setSlot(undefined);
    setStep('betrieb');
  };
  const editSlot = () => setStep('zeit');

  // ---------- Antworten unten ----------

  let replies: Reply[] = [];
  let onPick = pickClaim;
  if (step === 'melden') {
    replies = contract
      ? [
          { key: 'melden', label: de.costs.report },
          { key: 'selbst', label: de.costs.selfPay },
          { key: 'formular', label: g.form },
        ]
      : [
          { key: 'selbst', label: de.costs.toAppointment },
          { key: 'formular', label: g.form },
        ];
  } else if (step === 'betrieb') {
    onPick = pickPartner;
    replies = partners.map((p) => ({
      key: p.id,
      label: p.name,
      sub: de.common.dot(
        p.authorized ? de.partner.authorized(manufacturer) : de.partner.independent,
        de.partner.distance(formatDecimal(p.distanceKm)),
      ),
    }));
  } else if (step === 'zeit') {
    onPick = pickSlot;
    replies = demoConfig.slots.map((s) => ({ key: s, label: s }));
  } else {
    onPick = pickFinish;
    replies = [
      {
        key: 'anfragen',
        label: paid ? de.appointment.requestPaid : de.appointment.request,
      },
      { key: 'formular', label: g.form },
    ];
  }

  const paymentAnswer = selfPay
    ? contract
      ? de.costs.selfPay
      : de.costs.toAppointment
    : de.costs.report;

  const summary: [string, string][] = [
    [de.appointment.facts.partner, partner?.name ?? ''],
    [de.appointment.facts.slot, slot ?? ''],
    [
      de.appointment.facts.address,
      address ? de.appointment.addressLine(address.street, address.zip, address.city) : '',
    ],
    [de.appointment.facts.job, de.appointment.jobRepair(quote.repair.partName ?? '')],
    [de.appointment.facts.costs, costsLine(state, caseId, selfPay)],
  ];

  return (
    <CaseScreen
      title={de.screens.kosten}
      footer={<QuickReplies replies={replies} onPick={onPick} />}
      scrollRef={scrollRef}
    >
      <BotSays
        lines={[
          ...(finding?.component ? [g.intro(finding.component)] : []),
          g.costs(formatEuro(quote.repair.total), formatEuro(quote.replacement.total)),
        ]}
      >
        <View style={styles.full}>
          <CostCompare quote={quote} />
        </View>
      </BotSays>

      {contract ? (
        <BotSays sender={false} lines={[]}>
          <Text variant="bodyLg">{g.payer(insurer, formatEuro(state.demo.deductible))}</Text>
          <Text variant="bodyLg">{g.rejected(insurer)}</Text>
          {/* Was beim Versicherer ankommt (B-53) */}
          <View style={styles.full}>
            <Disclosure title={de.costs.preview(insurer)}>
              <View style={styles.preview}>
                <Text variant="meta">{de.costs.previewContract(contract.contractNumber)}</Text>
                <CaseFileCard caseId={caseId} detail="voll" />
              </View>
            </Disclosure>
          </View>
          <Text variant="meta">{de.costs.legal(insurer)}</Text>
          <Text variant="title">{g.ask(insurer)}</Text>
        </BotSays>
      ) : (
        <BotSays sender={false} lines={[]}>
          <Text variant="bodyLg">{de.costs.noContractText}</Text>
          <Text variant="title">{g.askNoContract}</Text>
        </BotSays>
      )}

      {step !== 'melden' ? (
        <>
          {/* Eine Schadenmeldung lässt sich nicht zurücknehmen, darum kein Stift */}
          <UserSaid text={paymentAnswer} onEdit={reported ? undefined : editPayment} />
          <BotSays
            lines={[
              ...(reported
                ? [g.reported(insurer)]
                : selfPay
                  ? [g.selfPay(formatEuro(quote.repair.total))]
                  : []),
              de.appointment.titleRepair,
            ]}
          />
        </>
      ) : null}

      {partner && step !== 'betrieb' ? (
        <>
          <UserSaid text={partner.name} onEdit={editPartner} />
          <BotSays lines={[de.appointment.when]} />
        </>
      ) : null}

      {slot && step === 'fertig' ? (
        <>
          <UserSaid text={slot} onEdit={editSlot} />
          <BotSays lines={[g.summary]}>
            <View style={styles.full}>
              <Card>
                <FactList items={summary} ruled />
              </Card>
            </View>
            {reported ? <InfoBox>{de.appointment.pending}</InfoBox> : null}
            <Text variant="body">
              {de.appointment.ecoDesign(
                caseAppliance(state, caseId).finding.partAcc,
                demoConfig.ecoDesignDeliveryDays,
              )}
            </Text>
            <Text variant="meta">{de.appointment.shares}</Text>
          </BotSays>
        </>
      ) : null}
    </CaseScreen>
  );
}

const styles = StyleSheet.create({
  full: { alignSelf: 'stretch' },
  preview: { gap: 8 },
});
