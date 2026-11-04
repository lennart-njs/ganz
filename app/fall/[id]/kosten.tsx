import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import { DemoHint } from '@/components/app/DemoHint';
import { CaseFileCard } from '@/components/app/CaseFileCard';
import { CaseScreen, useCaseId } from '@/components/app/CaseScreen';
import { CostCompare } from '@/components/app/CostCompare';
import { backToThread, leaveCase } from '@/components/nav/leaveCase';
import { ActionBar, Button, Card, Disclosure, FactList, Text, Toast } from '@/components/ds';
import { useCommand } from '@/hooks/useCommand';
import { de } from '@/i18n/de';
import { formatEuro } from '@/i18n/format';
import { latestDiagnosis } from '@/lib/caseView';
import { can } from '@/model/policies/actions';
import { selectCaseFacts } from '@/model/policies/caseFacts';
import { CONSENT_SCOPES } from '@/model/policies/consentScopes';
import { useAppStore } from '@/store/appStore';
import { insurerShortName } from '@/lib/service';

const t = de.costs;

/**
 * Kosten und Schadenmeldung: Reparatur gegen Ersatzgerät, Kostenträger, Selbstbeteiligung, was bei
 * Ablehnung passiert und was an den Versicherer geht. Der Schadenfall entsteht nur durch den Tap (B-17).
 * Welche Wege es gibt, sagen die Regeln in model/policies/actions.ts.
 */
export default function Kosten() {
  const caseId = useCaseId();
  const state = useAppStore();
  const c = state.cases[caseId];
  const caseFacts = selectCaseFacts(state, caseId);
  const quote = state.quotes.find((q) => q.id === c?.quoteId);
  const device = state.devices.find((d) => d.id === c?.deviceId);
  const contract = state.contracts.find((k) => k.id === device?.contractId);
  const finding = c
    ? (latestDiagnosis(state, c, 'fachkraft') ?? latestDiagnosis(state, c, 'betrieb'))
    : undefined;
  const insurer = insurerShortName(state, caseId);
  const deductible = formatEuro(state.demo.deductible);
  const replacement = finding?.errorPattern === 'ersatzgeraet_noetig';
  // Der Schadenfall entsteht nur einmal, auch bei einem Doppeltap. Danach weiter zum Termin.
  const report = useCommand(
    () => useAppStore.getState().reportClaim(caseId),
    () =>
      replacement ? backToThread(caseId) : router.push(`/fall/${caseId}/termin?art=reparatur`),
  );

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
  if (can(caseFacts, 'selbst_zahlen_nach_ablehnung')) {
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
            {can(caseFacts, 'abbrechen') ? (
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
            ) : null}
          </ActionBar>
        }
      >
        <Text variant="h1" accessibilityRole="header">
          {t.rejectedTitle(insurer)}
        </Text>
        <CostCompare quote={quote} />
      </CaseScreen>
    );
  }

  // Wer zahlt, sagen die Fakten: du selbst, Kranich nach der Freigabe oder, solange nichts
  // entschieden ist, Kranich vorbehaltlich Freigabe. Kein Betrag als Zusage.
  const payer = caseFacts?.payer;
  // Ohne Schutz, aber ein Regulierer wie der Händler kann die Kosten übernehmen: Der Zahler steht
  // noch nicht fest. Dann kein „Du selbst“ und kein „Du zahlst“, und Selbstzahlen nennt den Preis
  // (Übertragung 4.1). Den Fall an den Händler sendest du im Gespräch.
  const payerOpen = !contract && payer === undefined;
  const facts: [string, string][] = payerOpen
    ? []
    : payer === 'haushalt' || !contract
      ? [[t.payer, t.payerSelf]]
      : payer === 'versicherer'
        ? [
            [t.payer, t.payerApproved(insurer)],
            [t.deductible, deductible],
          ]
        : [
            [t.payer, t.payerValue(insurer)],
            [t.deductible, deductible],
            [t.ifRejected(insurer), t.ifRejectedValue],
          ];

  // Nach der Meldung kein zweites Melden (R-02). Mit laufendem Termin kein zweiter (R-08).
  const footer = can(caseFacts, 'schaden_melden') ? (
    <>
      {report.toast ? <Toast message={report.toast} style={styles.toast} /> : null}
      <ActionBar meta={t.barMeta(deductible)} sub={t.barSub}>
        <Button label={t.report} onPress={report.run} />
      </ActionBar>
    </>
  ) : can(caseFacts, 'termin_versicherer') ? (
    <ActionBar>
      <Button label={t.toAppointment} size="lg" fullWidth onPress={() => toAppointment(false)} />
    </ActionBar>
  ) : !contract && can(caseFacts, 'termin_selbst') ? (
    <ActionBar>
      <Button
        label={payerOpen ? t.rejectedSelfPay(formatEuro(quote.repair.total)) : t.toAppointment}
        size="lg"
        fullWidth
        onPress={() => toAppointment(true)}
      />
    </ActionBar>
  ) : undefined;

  return (
    <CaseScreen title={de.screens.kosten} footer={footer}>
      <DemoHint id="kosten" />
      {finding?.component ? <Text variant="meta">{t.findingMeta(finding.component)}</Text> : null}
      <Text variant="h1" accessibilityRole="header">
        {replacement ? t.titleReplacement : t.title}
      </Text>
      <CostCompare quote={quote} focus={replacement ? 'replacement' : 'repair'} />
      {facts.length ? (
        <Card>
          <FactList items={facts} ruled />
        </Card>
      ) : null}
      {!contract && !payerOpen ? <Text variant="body">{t.noContractText}</Text> : null}
      {replacement && contract ? <Text variant="body">{t.replacementNext(insurer)}</Text> : null}

      {contract ? (
        <>
          {/* Was beim Versicherer ankommt, genau das speichert die Bestätigung (B-53, R-14) */}
          <Disclosure title={t.preview(insurer)}>
            <CaseFileCard
              caseId={caseId}
              categories={CONSENT_SCOPES.weitergabe_versicherer.dataCategories}
            />
          </Disclosure>
          <Text variant="meta">{t.legal(insurer)}</Text>
          {/* Selbst zahlen nur als echte Wahl, nicht während der Prüfung (R-07) */}
          {!replacement && can(caseFacts, 'selbst_zahlen') ? (
            <Button label={t.selfPay} variant="link" onPress={() => toAppointment(true)} />
          ) : null}
        </>
      ) : null}
    </CaseScreen>
  );
}

const styles = StyleSheet.create({
  toast: { marginHorizontal: 16, marginBottom: 8 },
});
