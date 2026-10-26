import { router } from 'expo-router';

import { CaseScreen, useCaseId } from '@/components/app/CaseScreen';
import { leaveCase } from '@/components/nav/leaveCase';
import { ActionBar, Button, Card, FactList, Text, Timeline } from '@/components/ds';
import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';
import { statusView } from '@/lib/statusView';
import { activeBooking, nextSimulationDue, useAppStore } from '@/store/appStore';

const t = de.status;

/** Fall-Status: Zeitstrahl aus den Ereignissen, Fallnummer sichtbar, im Demo-Modus per Tap weiter. */
export default function Status() {
  const caseId = useCaseId();
  const state = useAppStore();
  const c = state.cases[caseId];
  if (!c) {
    return (
      <CaseScreen title={de.screens.status}>
        <Text variant="body">{de.result.missing}</Text>
      </CaseScreen>
    );
  }
  const view = statusView(state, c);
  const booking = activeBooking(state, caseId);
  const canAdvance = nextSimulationDue(state, caseId) !== undefined;
  const demoTap = demoConfig.demo.enabled && state.demo.hints && canAdvance;

  const primary =
    view.next === 'abschluss' ? (
      <Button
        label={t.toFinish}
        size="lg"
        fullWidth
        onPress={() => router.push(`/fall/${caseId}/abschluss`)}
      />
    ) : view.next === 'kosten' ? (
      <Button
        label={c.status === 'abgelehnt' ? t.whatNext : t.seeCosts}
        size="lg"
        fullWidth
        onPress={() => router.push(`/fall/${caseId}/kosten`)}
      />
    ) : (
      <Button label={t.toDevices} size="lg" fullWidth onPress={leaveCase} />
    );

  return (
    <CaseScreen
      title={de.screens.status}
      footer={
        <ActionBar>
          {primary}
          <Button
            label={t.caseFile}
            variant="secondary"
            fullWidth
            onPress={() => router.push(`/fall/${caseId}/fallakte`)}
          />
        </ActionBar>
      }
    >
      <Text variant="meta">{de.common.dot(t.caseNumber(c.id), c.problemLabel)}</Text>
      <Text variant="h1" accessibilityRole="header" accessibilityLiveRegion="polite">
        {view.headline}
      </Text>
      {view.text ? <Text variant="bodyLg">{view.text}</Text> : null}
      <Card>
        <Timeline items={view.timeline} />
      </Card>
      {booking ? (
        <Card>
          <Text variant="labelStrong" accessibilityRole="header">
            {t.booking}
          </Text>
          <FactList
            dense
            items={[
              [de.appointment.facts.partner, booking.provider.name],
              [de.appointment.facts.slot, booking.slotLabel],
              ...(booking.address
                ? ([
                    [
                      de.appointment.facts.address,
                      de.appointment.addressLine(
                        booking.address.street,
                        booking.address.zip,
                        booking.address.city,
                      ),
                    ],
                  ] as [string, string][])
                : []),
            ]}
          />
        </Card>
      ) : null}
      {demoTap ? (
        <Button
          label={t.demoNext}
          variant="link"
          onPress={() => useAppStore.getState().simulateNext(caseId)}
        />
      ) : null}
    </CaseScreen>
  );
}
