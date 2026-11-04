// Misslungene Reparatur in der Gewährleistung (Entscheidung Nr. 32): Gespräch, Status, Fallakte,
// Geräte-Liste und Demo-Steuerung. Innerhalb der Frist bessert derselbe Betrieb nach, ohne neue
// Schadenmeldung und ohne Betrag. Danach, mit „Reparatur liegt länger zurück“ oder wenn auch die
// Nachbesserung nicht half, beginnt eine neue Runde wie bisher.
import * as RN from 'react-native';
import { StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen, within } from 'expo-router/testing-library';

import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';
import { formatDate } from '@/i18n/format';
import { eventLabel } from '@/lib/caseEvents';
import { deviceStatusLabel } from '@/lib/caseView';
import { selectCaseFacts } from '@/model/policies/caseFacts';
import { addMonths } from '@/model/policies/warranty';
import { useAppStore } from '@/store/appStore';
import { APP } from '@/test/app';
import { addWasher, caseAfterFinding, caseOf, consentsFor, start } from '@/test/regressions';
import { unwrap } from '@/test/result';
import { colors } from '@/theme/colors';

const tap = (name: string | RegExp) => fireEvent.press(screen.getByRole('button', { name }));
const tapId = (id: string) => fireEvent.press(screen.getByTestId(id));
const button = (name: string | RegExp) => screen.queryByRole('button', { name });
const insurer = demoConfig.insurer.shortName;
const partner = demoConfig.partners[0]!;
const slot = demoConfig.slots[2]!;
const part = de.appliance.waschmaschine.finding.component;

/** Mit Schutz: Schadenfall, Freigabe, Termin, und der Betrieb hat repariert */
function repairedCase() {
  start();
  const deviceId = addWasher().id;
  const id = caseAfterFinding(deviceId);
  const s = useAppStore.getState();
  unwrap(s.reportClaim(id));
  unwrap(
    s.requestBooking({
      caseId: id,
      kind: 'reparatur',
      partnerId: partner.id,
      slotLabel: demoConfig.slots[0]!,
      selfPay: false,
    }),
  );
  while (useAppStore.getState().simulateNext(id));
  expect(caseOf(id).status).toBe('in_reparatur');
  return { id, deviceId };
}

/** Wie repairedCase, aber in der ersten Runde war im Videocall keine Fachkraft frei */
function repairedAfterNoExpert() {
  start();
  const deviceId = addWasher().id;
  const s = useAppStore.getState();
  const c = s.createCase({ deviceId, entry: 'foto', problemLabel: 'Wasserablauf gestört' });
  unwrap(s.escalate(c.id));
  const expert = demoConfig.partners.find((p) => p.id === demoConfig.expert.partnerId)!;
  const call = unwrap(
    s.requestVideoCall(c.id, {
      share: {
        caseId: c.id,
        purpose: 'weitergabe_fachkraft',
        legalBasis: 'vertrag',
        recipient: { id: expert.id, kind: 'betrieb', name: expert.name },
        dataCategories: ['fotos'],
        textVersion: '1',
      },
    }),
  );
  unwrap(s.updateVideoCall(call.id, 'keine_fachkraft'));
  unwrap(s.setFinding(c.id, 'reparatur', 'fachkraft'));
  unwrap(s.reportClaim(c.id));
  unwrap(
    s.requestBooking({
      caseId: c.id,
      kind: 'reparatur',
      partnerId: partner.id,
      slotLabel: demoConfig.slots[0]!,
      selfPay: false,
    }),
  );
  while (useAppStore.getState().simulateNext(c.id));
  return { id: c.id, deviceId };
}

/** Im Gespräch „Problem besteht weiter“ */
async function stillBroken(id: string) {
  const r = await renderRouter(APP, { initialUrl: `/fall/${id}` });
  await tapId('antwort-weiter-kaputt');
  return r;
}

const claims = (id: string) =>
  useAppStore.getState().events.filter((e) => e.caseId === id && e.type === 'schaden_gemeldet');

describe('Nachbesserung im Gespräch (Nr. 32)', () => {
  test('innerhalb der Frist: der Betrieb bessert nach, ohne neue Meldung und ohne Betrag', async () => {
    const { id, deviceId } = repairedCase();
    const consents = useAppStore.getState().consents.length;
    await stillBroken(id);
    expect(caseOf(id).status).toBe('nachbesserung');
    const until = caseOf(id).rework!.until;
    expect(until).toBe(addMonths(caseOf(id).rework!.completedAt, demoConfig.warranty.months));
    expect(screen.getByText(de.rework.title)).toBeTruthy();
    expect(screen.getByText(de.rework.text(partner.name))).toBeTruthy();
    expect(screen.getByText(de.rework.noClaim(insurer))).toBeTruthy();
    expect(
      screen.getByText(de.rework.until(formatDate(until), demoConfig.warranty.months)),
    ).toBeTruthy();
    expect(screen.getByText(de.rework.when(partner.name))).toBeTruthy();
    // Kein Schadenfall, kein Betrag, kein Hilfe holen, keine Wahl des Betriebs
    expect(button(de.costs.report)).toBeNull();
    expect(button(de.costs.selfPay)).toBeNull();
    expect(button(de.appointment.requestPaid)).toBeNull();
    expect(button(new RegExp(`^${de.thread.callStart}`))).toBeNull();
    expect(screen.queryByTestId(`antwort-betrieb-${partner.id}`)).toBeNull();
    expect(screen.queryByText(/Du zahlst|Selbstbeteiligung/)).toBeNull();
    expect(deviceStatusLabel(useAppStore.getState(), deviceId)).toBe(de.deviceStatus.nachbesserung);

    await tapId(`antwort-zeit-${slot}`);
    expect(screen.getByText(de.rework.job(part))).toBeTruthy();
    expect(screen.getByText(de.rework.costs)).toBeTruthy();
    expect(button(de.appointment.requestPaid)).toBeNull();
    await tapId('antwort-nachbesserung');
    const visit = useAppStore.getState().bookings.at(-1)!;
    expect(visit).toMatchObject({
      reworkOf: caseOf(id).rework!.repairBookingId,
      provider: { id: partner.id },
      slotLabel: slot,
      subjectToApproval: false,
    });
    expect(visit.binding).toBeUndefined();
    expect(useAppStore.getState().consents).toHaveLength(consents);
    expect(screen.getByText(de.rework.bookingAnswer(slot, partner.name))).toBeTruthy();
    expect(deviceStatusLabel(useAppStore.getState(), deviceId)).toBe(
      de.deviceStatus.nachbesserungTermin(slot),
    );

    // Der Betrieb kommt ohne „Zahlungspflichtig buchen“
    for (let i = 0; i < 3; i++) await tapId('antwort-demo');
    expect(screen.getByText(de.rework.done(partner.name))).toBeTruthy();
    expect(button(de.appointment.requestPaid)).toBeNull();
    await tapId('antwort-laeuft');
    expect(caseOf(id)).toMatchObject({ status: 'erledigt', resolution: 'repariert' });
    expect(caseOf(id).claim).toBeUndefined();
    expect(claims(id)).toHaveLength(1);
  });

  test('war in der ersten Runde keine Fachkraft frei: kein Rückruf, sondern der Termin', async () => {
    const { id } = repairedAfterNoExpert();
    await stillBroken(id);
    expect(caseOf(id).status).toBe('nachbesserung');
    expect(screen.queryByText(de.thread.callbackAsk)).toBeNull();
    expect(screen.queryByTestId(`antwort-rueckruf-${de.waiting.callbackSlots[0]}`)).toBeNull();
    expect(screen.queryByTestId('antwort-vor-ort')).toBeNull();
    expect(screen.getByTestId(`antwort-zeit-${slot}`)).toBeTruthy();
  });

  test('Weitergabe an den Betrieb widerrufen: erst erneut bestätigen, abbrechen geht auch', async () => {
    const { id } = repairedCase();
    await stillBroken(id);
    await act(async () => {
      for (const c of consentsFor('weitergabe_betrieb', id))
        useAppStore.getState().revokeConsent(c.id);
    });
    expect(screen.getByText(de.thread.renewAsk(partner.name))).toBeTruthy();
    expect(screen.getByRole('button', { name: de.closeCase.cancel })).toBeTruthy();
    expect(screen.queryByTestId(`antwort-zeit-${slot}`)).toBeNull();
    expect(screen.queryByTestId('antwort-nachbesserung')).toBeNull();
    await tap(new RegExp(`^${de.thread.renewShare}`));
    expect(selectCaseFacts(useAppStore.getState(), id)?.hold).toBeUndefined();
    const renewed = consentsFor('weitergabe_betrieb', id).filter((c) => !c.revokedAt);
    expect(renewed.map((c) => c.recipient.id)).toEqual([partner.id]);
    await tapId(`antwort-zeit-${slot}`);
    await tapId('antwort-nachbesserung');
    expect(useAppStore.getState().bookings.at(-1)?.reworkOf).toBeDefined();
  });

  test('„Reparatur liegt länger zurück“: neue Runde wie bisher, Hilfe holen', async () => {
    const { id } = repairedCase();
    useAppStore.getState().setDemo({ repairLongAgo: true });
    await stillBroken(id);
    expect(caseOf(id).status).toBe('eskaliert');
    expect(caseOf(id).rework).toBeUndefined();
    expect(screen.getByText(de.rework.expired)).toBeTruthy();
    expect(screen.getByText(de.rework.newRound)).toBeTruthy();
    expect(screen.queryByText(de.rework.title)).toBeNull();
    expect(button(new RegExp(`^${de.thread.callStart}`))).toBeTruthy();
    // Kein Schadenfall ohne eigenen Tap, auch in der neuen Runde
    expect(caseOf(id).claim).toBeUndefined();
    expect(claims(id)).toHaveLength(1);
  });

  test('hilft auch die Nachbesserung nicht: neue Runde, Schadenfall nur mit eigenem Tap', async () => {
    const { id } = repairedCase();
    await stillBroken(id);
    await tapId(`antwort-zeit-${slot}`);
    await tapId('antwort-nachbesserung');
    for (let i = 0; i < 3; i++) await tapId('antwort-demo');
    await tapId('antwort-weiter-kaputt');
    expect(caseOf(id).status).toBe('eskaliert');
    expect(screen.getByText(de.rework.failed)).toBeTruthy();
    expect(screen.getAllByText(de.rework.newRound)).toHaveLength(1);
    expect(button(new RegExp(`^${de.thread.callStart}`))).toBeTruthy();
    // Neuer Befund: Melden geht, aber nur mit dem Tap
    await act(async () => {
      unwrap(useAppStore.getState().setFinding(id, 'reparatur', 'fachkraft'));
    });
    expect(caseOf(id).claim).toBeUndefined();
    expect(claims(id)).toHaveLength(1);
    await tapId('antwort-melden');
    expect(caseOf(id).claim).toBeDefined();
    expect(claims(id)).toHaveLength(2);
  });

  test('Nachbesserung abbrechen: Absage, ohne den Satz zu den Kosten', async () => {
    const { id } = repairedCase();
    await stillBroken(id);
    await tapId(`antwort-zeit-${slot}`);
    await tapId('antwort-nachbesserung');
    await tap(de.a11y.close);
    await tap(de.closeCase.cancel);
    expect(screen.getByText(de.closeCase.partnerNotice(partner.name))).toBeTruthy();
    expect(screen.queryByText(de.closeCase.costsOpen(partner.name))).toBeNull();
    const sheet = within(
      screen.container.queryAll((x) => x.props.accessibilityViewIsModal === true).at(-1)!,
    );
    await fireEvent.press(sheet.getByRole('radio', { name: de.closeCase.reasons[0] }));
    await fireEvent.press(sheet.getByRole('button', { name: de.closeCase.confirmCancel }));
    expect(caseOf(id).status).toBe('abgebrochen');
    expect(useAppStore.getState().bookings.at(-1)?.status).toBe('storniert');
  });

  test('dunkel und mit 200 % Schrift: Texte aus dem Theme, Buttons ab 44 pt', async () => {
    const scheme = jest.spyOn(RN, 'useColorScheme').mockReturnValue('dark');
    const size = jest
      .spyOn(RN, 'useWindowDimensions')
      .mockReturnValue({ width: 390, height: 844, scale: 3, fontScale: 2 });
    const { id } = repairedCase();
    await stillBroken(id);
    await tapId(`antwort-zeit-${slot}`);
    expect(screen.getByText(de.rework.costs)).toHaveStyle({ color: colors.dark.textStrong });
    const request = screen.getByTestId('antwort-nachbesserung');
    expect(StyleSheet.flatten(request.props.style).minHeight).toBeGreaterThanOrEqual(44);
    expect(screen.getByRole('button', { name: new RegExp(`^${de.rework.request}`) })).toBeTruthy();
    // Die neuen Texte der Nachbesserung wachsen bis 200 % mit
    const texts = [
      de.rework.title,
      de.rework.text(partner.name),
      de.rework.noClaim(insurer),
      de.rework.when(partner.name),
      de.rework.job(part),
      de.rework.costs,
    ];
    for (const text of texts) {
      const n = screen.getByText(text);
      expect(n.props.allowFontScaling).not.toBe(false);
      expect(n.props.maxFontSizeMultiplier ?? 2).toBeGreaterThanOrEqual(2);
    }
    scheme.mockRestore();
    size.mockRestore();
  });
});

describe('Nachbesserung in Status und Fallakte (Nr. 32)', () => {
  test('Status: der Betrieb bessert nach, im Zeitstrahl als Gewährleistung', async () => {
    const { id } = repairedCase();
    const r = await stillBroken(id);
    await act(async () => router.push(`/fall/${id}/status`));
    expect(r.getPathname()).toBe(`/fall/${id}/status`);
    expect(screen.getByText(de.status.headline.nachbesserung(partner.name))).toBeTruthy();
    expect(screen.getByText(de.status.text.nachbesserung)).toBeTruthy();
    expect(screen.getByText(de.status.timeline.nachbesserung)).toBeTruthy();
    expect(screen.queryByText(de.status.headline.repariert)).toBeNull();
  });

  test('Fallakte: Nachbesserung, Termin und Abschluss als Gewährleistung, Status Nachbesserung', async () => {
    const { id } = repairedCase();
    await stillBroken(id);
    await tapId(`antwort-zeit-${slot}`);
    await tapId('antwort-nachbesserung');
    for (let i = 0; i < 3; i++) await tapId('antwort-demo');
    await act(async () => router.push(`/fall/${id}/fallakte`));
    const until = formatDate(caseOf(id).rework!.until);
    expect(screen.getByText(de.file.status(de.caseStatus.nachbesserung))).toBeTruthy();
    const events = useAppStore.getState().events.filter((e) => e.caseId === id);
    const label = (type: string) => events.filter((e) => e.type === type).map(eventLabel);
    expect(label('nachbesserung_verlangt')).toEqual([
      de.file.event.detail(
        de.caseEvent.nachbesserung_verlangt,
        de.file.event.rework(partner.name, until),
      ),
    ]);
    expect(label('termin_angefragt').at(-1)).toBe(
      de.file.event.detail(
        de.caseEvent.termin_angefragt,
        de.file.event.reworkBooking(partner.name, slot),
      ),
    );
    expect(label('reparatur_abgeschlossen')).toEqual([
      de.caseEvent.reparatur_abgeschlossen,
      de.file.event.detail(de.caseEvent.reparatur_abgeschlossen, de.file.event.reworkDone),
    ]);
    for (const l of [...label('nachbesserung_verlangt'), label('termin_angefragt').at(-1)!]) {
      expect(screen.getByText(l)).toBeTruthy();
    }
  });

  test('Fallakte nach Ablauf: „Problem besteht weiter“ mit dem Grund', () => {
    const { id } = repairedCase();
    useAppStore.getState().setDemo({ repairLongAgo: true });
    unwrap(useAppStore.getState().confirmRepair(id, false));
    const e = useAppStore
      .getState()
      .events.filter((x) => x.caseId === id && x.type === 'problem_besteht_weiter')
      .at(-1)!;
    expect(eventLabel(e)).toBe(
      de.file.event.detail(de.caseEvent.problem_besteht_weiter, de.file.event.noRework.abgelaufen),
    );
  });
});

describe('Demo-Steuerung: „Reparatur liegt länger zurück“ (Nr. 32)', () => {
  test('der Schalter steht in der Demo-Steuerung und setzt die Einstellung', async () => {
    start();
    addWasher();
    await renderRouter(APP, { initialUrl: '/profil' });
    const version = screen.getByText(/^Version/);
    for (let i = 0; i < 7; i++) await fireEvent.press(version);
    expect(useAppStore.getState().demo.repairLongAgo).toBe(false);
    expect(screen.getByText(de.demoControl.repairLongAgoSub)).toBeTruthy();
    await fireEvent.press(screen.getByRole('checkbox', { name: de.demoControl.repairLongAgo }));
    expect(useAppStore.getState().demo.repairLongAgo).toBe(true);
    // Zurücksetzen und Startstand stellen ihn wieder aus
    await act(async () => useAppStore.getState().loadDemoStart());
    expect(useAppStore.getState().demo.repairLongAgo).toBe(false);
  });
});
