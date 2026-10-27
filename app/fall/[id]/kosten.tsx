import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { DemoHint } from '@/components/app/DemoHint';
import { CaseFileCard } from '@/components/app/CaseFileCard';
import { CaseScreen, useCaseId } from '@/components/app/CaseScreen';
import { CostCompare } from '@/components/app/CostCompare';
import { backToThread, leaveCase } from '@/components/nav/leaveCase';
import { ActionBar, Button, Card, Disclosure, FactList, Text } from '@/components/ds';
import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';
import { formatEuro } from '@/i18n/format';
import { latestDiagnosis } from '@/lib/caseView';
import { useAppStore } from '@/store/appStore';

const t = de.costs;
const CLAIM_TEXT_VERSION = '2026-10-1';

/**
 * Kosten und Schadenmeldung: Reparatur gegen Ersatzgerät, Kostenträger, Selbstbeteiligung, was bei
 * Ablehnung passiert und was an den Versicherer geht. Der Schadenfall entsteht nur durch den Tap (B-17).
 */
export default function Kosten() {
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
  const deductible = formatEuro(state.demo.deductible);
  const replacement = finding?.errorPattern === 'ersatzgeraet_noetig';

  if (!c || !quote) {
    return (
      <CaseScreen title={de.screens.kosten}>
        <Text variant="body">{de.result.missing}</Text>
      </CaseScreen>
    );
  }

  const toAppointment = (selfPay: boolean) =>
    router.push(`/fall/${caseId}/termin?art=reparatur${selfPay ? '&zahlung=selbst' : ''}`);

  // Abgelehnt: Die Nutzerin entscheidet neu
  if (c.status === 'abgelehnt') {
    return (
      <CaseScreen
        title={de.screens.kosten}
        footer={
          <ActionBar>
            <Button
              label={t.rejectedSelfPay(formatEuro(quote.repair.total))}
              size="lg"
              fullWidth
              onPress={() => toAppointment(true)}
            />
            <Button label={t.keepQuote} variant="secondary" fullWidth onPress={leaveCase} />
            <Button
              label={t.closeCase}
              variant="link"
              onPress={() => {
                useAppStore
                  .getState()
                  .runCommand(caseId, 'abbrechen', { cancelReason: t.closeReason });
                leaveCase();
              }}
            />
          </ActionBar>
        }
      >
        <Text variant="h1" accessibilityRole="header">
          {t.rejectedTitle(insurer)}
        </Text>
        <Text variant="bodyLg">{t.rejectedText}</Text>
        <CostCompare quote={quote} />
      </CaseScreen>
    );
  }

  const report = () => {
    useAppStore.getState().reportClaim(caseId, CLAIM_TEXT_VERSION);
    if (replacement) backToThread(caseId);
    else toAppointment(false);
  };

  const facts = contract
    ? ([
        [t.payer, t.payerValue(insurer)],
        [t.deductible, deductible],
        [t.ifRejected(insurer), t.ifRejectedValue],
      ] as [string, string][])
    : ([[t.payer, t.payerSelf]] as [string, string][]);

  return (
    <CaseScreen
      title={de.screens.kosten}
      footer={
        contract ? (
          <ActionBar meta={t.barMeta(deductible)} sub={t.barSub}>
            <Button label={t.report} onPress={report} />
          </ActionBar>
        ) : (
          <ActionBar>
            <Button
              label={t.toAppointment}
              size="lg"
              fullWidth
              onPress={() => toAppointment(true)}
            />
          </ActionBar>
        )
      }
    >
      <DemoHint id="kosten" />
      {finding?.component ? <Text variant="meta">{t.findingMeta(finding.component)}</Text> : null}
      <Text variant="h1" accessibilityRole="header">
        {replacement ? t.titleReplacement : t.title}
      </Text>
      <CostCompare quote={quote} focus={replacement ? 'replacement' : 'repair'} />
      <Card>
        <FactList items={facts} ruled />
      </Card>
      {!contract ? <Text variant="body">{t.noContractText}</Text> : null}
      {replacement && contract ? <Text variant="body">{t.replacementNext(insurer)}</Text> : null}

      {contract ? (
        <>
          {/* Was beim Versicherer ankommt (B-53, Q-9) */}
          <Disclosure title={t.preview(insurer)}>
            <View style={styles.preview}>
              <Text variant="meta">{t.previewContract(contract.contractNumber)}</Text>
              <CaseFileCard caseId={caseId} detail="voll" />
            </View>
          </Disclosure>
          <Text variant="meta">{t.legal(insurer)}</Text>
          {!replacement ? (
            <Button label={t.selfPay} variant="link" onPress={() => toAppointment(true)} />
          ) : null}
        </>
      ) : null}
    </CaseScreen>
  );
}

const styles = StyleSheet.create({
  preview: { gap: 8 },
});
