import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen, within } from 'expo-router/testing-library';

import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';
import { statusView } from '@/lib/statusView';
import { availableActions } from '@/model/policies/actions';
import { selectCaseFacts } from '@/model/policies/caseFacts';
import { CONSENT_SCOPES } from '@/model/policies/consentScopes';
import { nextSimulationDue, simulationHold, useAppStore } from '@/store/appStore';
import { APP } from '@/test/app';

const tap = (name: string | RegExp) => fireEvent.press(screen.getByRole('button', { name }));
const advance = (ms: number) =>
  act(async () => {
    jest.advanceTimersByTime(ms);
  });

/** Fall nach Befund, Schadenmeldung und Terminanfrage */
async function bookedCase(scenario: 'freigeben' | 'ablehnen' = 'freigeben') {
  const s = useAppStore.getState();
  s.reset();
  useAppStore.setState({ onboardingDone: true });
  s.setDemo({ claimScenario: scenario });
  s.linkContract('vertragsnummer');
  const device = s.addDevice({
    manufacturerId: 'miele',
    category: 'waschmaschine',
    model: 'WKB 130',
    identifiedBy: 'vertrag',
    contractId: useAppStore.getState().contracts[0]!.id,
  });
  const c = s.createCase({
    deviceId: device.id,
    entry: 'foto',
    problemLabel: 'Wasserablauf gestört',
  });
  s.escalate(c.id);
  s.setFinding(c.id, 'reparatur', 'fachkraft');
  const r = await renderRouter(APP, { initialUrl: `/fall/${c.id}/kosten` });
  await tap(de.costs.report);
  await fireEvent.press(screen.getByRole('radio', { name: demoConfig.slots[0] }));
  await tap(de.appointment.request);
  await act(async () => {});
  return { id: c.id, r };
}

const caseOf = (id: string) => useAppStore.getState().cases[id]!;
const bookingOf = (id: string) => useAppStore.getState().bookings.find((b) => b.caseId === id)!;

beforeEach(() => {
  jest.mocked(Notifications.scheduleNotificationAsync).mockClear();
  jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValue({
    granted: true,
    canAskAgain: true,
  } as Awaited<ReturnType<typeof Notifications.requestPermissionsAsync>>);
});

describe('Fall-Status', () => {
  test('der Mock-Timer schaltet Freigabe, Bestätigung, unterwegs und repariert', async () => {
    const { id, r } = await bookedCase();
    // Nach der Terminanfrage geht es im Gespräch des Falls weiter
    expect(r.getPathname()).toBe(`/fall/${id}`);
    expect(screen.getByText(de.status.headline.pruefung('Kranich'))).toBeTruthy();
    expect(screen.getByText(de.status.caseNumber(id), { exact: false })).toBeTruthy();

    await advance(demoConfig.timers.claimMs + 1000);
    expect(caseOf(id).claim?.decision).toMatchObject({ result: 'freigegeben', actor: 'mensch' });

    await advance(demoConfig.timers.bookingStepMs + 1000);
    expect(caseOf(id).status).toBe('in_reparatur');
    expect(bookingOf(id).status).toBe('bestaetigt');

    await advance(demoConfig.timers.bookingStepMs + 1000);
    expect(bookingOf(id).status).toBe('unterwegs');

    await advance(demoConfig.timers.bookingStepMs + 1000);
    expect(bookingOf(id).status).toBe('erledigt');
    expect(bookingOf(id).completionPhotoId).toBeDefined();
    expect(screen.getByText(de.status.headline.repariert)).toBeTruthy();
    // Der Fall bleibt offen, bis die Nutzerin bestätigt
    expect(caseOf(id).status).toBe('in_reparatur');
  });

  test('im Demo-Modus geht es per Tap weiter', async () => {
    const { id } = await bookedCase();
    await tap(de.status.demoNext);
    expect(caseOf(id).status).toBe('freigegeben');
    await tap(de.status.demoNext);
    expect(bookingOf(id).status).toBe('bestaetigt');
  });

  test('lokale Mitteilung bei jedem Wechsel, nach Zustimmung', async () => {
    const { id } = await bookedCase();
    expect(useAppStore.getState().notifications).toBe('erlaubt');
    await tap(de.status.demoNext);
    await tap(de.status.demoNext);
    await act(async () => {});
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
    expect(jest.mocked(Notifications.scheduleNotificationAsync).mock.calls[0]![0]).toMatchObject({
      content: de.notify.update,
    });
    expect(caseOf(id).status).toBe('in_reparatur');
  });

  test('die Zustimmung speichert eine Einwilligung, ohne sie keine Mitteilung (R-13)', async () => {
    const { id } = await bookedCase();
    const consent = useAppStore.getState().consents.find((c) => c.purpose === 'mitteilungen')!;
    expect(consent).toMatchObject({
      legalBasis: 'einwilligung',
      dataCategories: [...CONSENT_SCOPES.mitteilungen.dataCategories],
    });
    expect(consent.caseId).toBeUndefined();
    await act(async () => useAppStore.getState().revokeConsent(consent.id));
    // Das System erlaubt sie weiter, aber die Einwilligung fehlt
    expect(useAppStore.getState().notifications).toBe('erlaubt');
    await tap(de.status.demoNext);
    await act(async () => {});
    expect(caseOf(id).status).toBe('freigegeben');
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  test('Mitteilungstexte haben keine Platzhalter für Falldetails (R-17)', () => {
    for (const msg of Object.values(de.notify)) {
      expect(typeof msg.title).toBe('string');
      expect(typeof msg.body).toBe('string');
    }
  });

  test('ohne Zustimmung keine Mitteilung', async () => {
    jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValue({
      granted: false,
      canAskAgain: false,
    } as Awaited<ReturnType<typeof Notifications.requestPermissionsAsync>>);
    await bookedCase();
    expect(useAppStore.getState().notifications).toBe('abgelehnt');
    await tap(de.status.demoNext);
    await act(async () => {});
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  test('abgelehnt: der Status sagt es und führt zur Entscheidung', async () => {
    const { id, r } = await bookedCase('ablehnen');
    await tap(de.status.demoNext);
    expect(caseOf(id).status).toBe('abgelehnt');
    expect(screen.getByText(de.status.headline.abgelehnt('Kranich'))).toBeTruthy();
    expect(r.getPathname()).toBe(`/fall/${id}`);
    // Du entscheidest neu: selbst zahlen, Kostenvoranschlag behalten oder Fall schließen
    expect(
      screen.getByRole('button', { name: de.thread.rejectedChoice.selfPay('189 €') }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: de.thread.rejectedChoice.keep })).toBeTruthy();
    await tap(de.thread.rejectedChoice.close);
    expect(caseOf(id).status).toBe('abgebrochen');
  });
});

describe('Widerruf hält die Simulation an (R-12)', () => {
  const revoke = (purpose: 'weitergabe_versicherer' | 'weitergabe_betrieb', id: string) =>
    act(async () => {
      const s = useAppStore.getState();
      const consent = s.consents.find((c) => c.purpose === purpose && c.caseId === id)!;
      s.revokeConsent(consent.id);
    });

  test('Weitergabe an den Versicherer widerrufen: keine Entscheidung, auch nicht per Timer', async () => {
    const { id, r } = await bookedCase();
    await revoke('weitergabe_versicherer', id);
    expect(simulationHold(useAppStore.getState(), id)).toBe('weitergabe_versicherer');
    expect(nextSimulationDue(useAppStore.getState(), id)).toBeUndefined();
    await advance(demoConfig.timers.claimMs * 3);
    expect(caseOf(id).status).toBe('freigabe_noetig');
    expect(caseOf(id).claim?.decision).toBeUndefined();
    // Das Gespräch sagt, warum es nicht weitergeht, und bietet keinen Demo-Schritt an
    expect(r.getPathname()).toBe(`/fall/${id}`);
    expect(screen.getByText(de.status.text.paused)).toBeTruthy();
    expect(screen.queryByText(de.status.text.pruefung)).toBeNull();
    expect(screen.queryByRole('button', { name: de.status.demoNext })).toBeNull();
  });

  test('Weitergabe an den Betrieb widerrufen: der Betrieb bestätigt nicht', async () => {
    const { id, r } = await bookedCase();
    await tap(de.status.demoNext);
    expect(caseOf(id).status).toBe('freigegeben');
    await revoke('weitergabe_betrieb', id);
    expect(simulationHold(useAppStore.getState(), id)).toBe('weitergabe_betrieb');
    await advance(demoConfig.timers.bookingStepMs * 3);
    expect(useAppStore.getState().simulateNext(id)).toBe(false);
    expect(bookingOf(id).status).toBe('angefragt');
    expect(caseOf(id).status).toBe('freigegeben');
    await act(async () => router.push(`/fall/${id}/status`));
    expect(r.getPathname()).toBe(`/fall/${id}/status`);
    expect(screen.getByText(de.status.text.paused)).toBeTruthy();
    expect(screen.queryByRole('button', { name: de.status.demoNext })).toBeNull();
  });

  test('im Gespräch: die Weitergabe mit einem Tap erneut bestätigen, dann entscheidet der Versicherer', async () => {
    const { id } = await bookedCase();
    await revoke('weitergabe_versicherer', id);
    expect(screen.getByText(de.thread.renewAsk('Kranich'))).toBeTruthy();
    // Derselbe Text wie vor der Meldung
    expect(screen.getByText(de.costs.legal('Kranich'))).toBeTruthy();
    await tap(new RegExp(`^${de.thread.renewShare}`));
    await act(async () => {});
    expect(simulationHold(useAppStore.getState(), id)).toBeUndefined();
    expect(screen.queryByText(de.status.text.paused)).toBeNull();
    await advance(demoConfig.timers.claimMs + 1000);
    expect(caseOf(id).claim?.decision?.result).toBe('freigegeben');
  });

  // Seit Nr. 34 bietet der Halt in der Reparatur auch „Fall abbrechen“
  test('in der Reparatur: erneut bestätigen oder abbrechen, nach dem Bestätigen kommt der Betrieb', async () => {
    const { id } = await bookedCase();
    await tap(de.status.demoNext);
    await tap(de.status.demoNext);
    expect(caseOf(id).status).toBe('in_reparatur');
    await revoke('weitergabe_betrieb', id);
    const partner = bookingOf(id).provider.name;
    expect(screen.getByText(de.status.text.paused)).toBeTruthy();
    expect(screen.getByText(de.thread.renewAsk(partner))).toBeTruthy();
    expect(screen.getByRole('button', { name: de.closeCase.cancel })).toBeTruthy();
    expect(screen.queryByRole('button', { name: de.status.demoNext })).toBeNull();
    await tap(new RegExp(`^${de.thread.renewShare}`));
    await act(async () => {});
    const renewed = useAppStore
      .getState()
      .consents.filter((c) => c.purpose === 'weitergabe_betrieb' && !c.revokedAt);
    expect(renewed.map((c) => c.recipient.id)).toEqual([bookingOf(id).provider.id]);
    await tap(de.status.demoNext);
    expect(bookingOf(id).status).toBe('unterwegs');
  });

  test('nach dem Widerruf in der Reparatur abbrechen (Nr. 34): Absage, keine neue Weitergabe', async () => {
    const { id, r } = await bookedCase();
    await tap(de.status.demoNext);
    await tap(de.status.demoNext);
    expect(caseOf(id).status).toBe('in_reparatur');
    await revoke('weitergabe_betrieb', id);
    const partner = bookingOf(id).provider.name;
    const consents = useAppStore.getState().consents.length;
    await tap(de.closeCase.cancel);
    // Das Sheet beginnt gleich mit dem Grund und nennt vorher die Absage an den Betrieb
    expect(screen.getByRole('header', { name: de.closeCase.reasonTitle })).toBeTruthy();
    expect(screen.getByText(de.closeCase.partnerNotice(partner))).toBeTruthy();
    expect(screen.getByText(de.closeCase.costsOpen(partner))).toBeTruthy();
    // Der Button im Sheet, nicht die Antwort im Gespräch dahinter
    const sheet = within(
      screen.container.queryAll((x) => x.props.accessibilityViewIsModal === true).at(-1)!,
    );
    await fireEvent.press(sheet.getByRole('radio', { name: de.closeCase.reasons[1] }));
    await fireEvent.press(sheet.getByRole('button', { name: de.closeCase.confirmCancel }));
    expect(r.getPathname()).toBe('/');
    expect(caseOf(id)).toMatchObject({
      status: 'abgebrochen',
      cancelReason: de.closeCase.reasons[1],
    });
    expect(bookingOf(id).status).toBe('storniert');
    expect(useAppStore.getState().consents).toHaveLength(consents);
    expect(nextSimulationDue(useAppStore.getState(), id)).toBeUndefined();
    await advance(demoConfig.timers.bookingStepMs * 3);
    expect(bookingOf(id).status).toBe('storniert');
  });

  test('eine Bestätigung für einen anderen Betrieb zählt nicht', async () => {
    const { id } = await bookedCase();
    await tap(de.status.demoNext);
    await revoke('weitergabe_betrieb', id);
    await act(async () => {
      useAppStore.getState().grantConsent({
        caseId: id,
        purpose: 'weitergabe_betrieb',
        legalBasis: 'vertrag',
        recipient: { id: demoConfig.partners[1]!.id, kind: 'betrieb', name: 'anderer Betrieb' },
        dataCategories: [...CONSENT_SCOPES.weitergabe_betrieb.dataCategories],
        textVersion: '2026-10-1',
      });
    });
    expect(useAppStore.getState().simulateNext(id)).toBe(false);
    expect(bookingOf(id).status).toBe('angefragt');
  });
});

describe('Abschluss', () => {
  async function repaired() {
    const res = await bookedCase();
    for (let i = 0; i < 4; i++) await tap(de.status.demoNext);
    expect(res.r.getPathname()).toBe(`/fall/${res.id}`);
    return res;
  }

  test('„Läuft wieder“ schließt den Fall, dann Bewertung', async () => {
    const { id } = await repaired();
    expect(screen.getByText(de.appliance.waschmaschine.runsAgain)).toBeTruthy();
    await tap(de.finish.runsAgain);
    expect(caseOf(id)).toMatchObject({ status: 'erledigt', resolution: 'repariert' });
    await fireEvent.press(screen.getByRole('radio', { name: de.a11y.starsOf(5) }));
    expect(bookingOf(id).rating?.stars).toBe(5);
    expect(useAppStore.getState().events.at(-1)?.type).toBe('bewertet');
  });

  // Seit Nr. 32 nur nach Ablauf der Gewährleistung. Davor bessert der Betrieb nach, siehe
  // warranty.test.tsx. Die Demo-Steuerung stellt die Reparatur dafür länger zurück.
  test('„Problem besteht weiter“ öffnet den Fall wieder', async () => {
    const { id, r } = await repaired();
    await act(async () => useAppStore.getState().setDemo({ repairLongAgo: true }));
    await tap(de.finish.stillBroken);
    expect(caseOf(id).status).toBe('eskaliert');
    expect(r.getPathname()).toBe(`/fall/${id}`);
    expect(
      screen.getByRole('button', { name: new RegExp(`^${de.thread.callStart}`) }),
    ).toBeTruthy();
  });

  // Seit Nr. 32 nach Ablauf der Gewährleistung, wie in der Demo mit „Reparatur liegt länger zurück“
  test('nach „Problem besteht weiter“ beginnt eine neue Runde: Vor Ort, Befund, Kosten, Meldung und Termin', async () => {
    const { id } = await repaired();
    await act(async () => useAppStore.getState().setDemo({ repairLongAgo: true }));
    await tap(de.finish.stillBroken);
    expect(caseOf(id).rework).toBeUndefined();
    // Der Status sagt nicht mehr „Repariert.“, der alte Termin zählt nicht mehr
    const view = statusView(useAppStore.getState(), caseOf(id));
    expect(view.headline).not.toBe(de.status.headline.repariert);
    expect(view.next).not.toBe('abschluss');
    // Vor Ort führt zur Wahl des Betriebs
    await fireEvent.press(screen.getByTestId('antwort-vor-ort'));
    expect(screen.getByTestId(`antwort-betrieb-${demoConfig.partners[0]!.id}`)).toBeTruthy();
    await tap(de.talk.edit(de.thread.onSite));

    // Neuer Befund aus dem Videocall: Kosten und Meldung sind wieder offen
    await act(async () => {
      useAppStore.getState().setFinding(id, 'reparatur', 'fachkraft');
    });
    const facts = selectCaseFacts(useAppStore.getState(), id)!;
    expect(availableActions(facts)).toEqual(
      expect.arrayContaining(['schaden_melden', 'selbst_zahlen']),
    );
    // Der alte Kostenvoranschlag bleibt im Verlauf stehen, der neue kommt dazu
    expect(screen.getAllByText(de.costs.title)).toHaveLength(2);
    await fireEvent.press(screen.getByTestId('antwort-melden'));
    expect(caseOf(id).claim?.decision).toBeUndefined();
    expect(caseOf(id).rounds?.[0]?.claim?.decision?.result).toBe('freigegeben');
    await fireEvent.press(screen.getByTestId(`antwort-betrieb-${demoConfig.partners[0]!.id}`));
    await fireEvent.press(screen.getByTestId(`antwort-zeit-${demoConfig.slots[1]}`));
    await fireEvent.press(screen.getByTestId('antwort-anfragen'));
    await act(async () => {});
    const repairs = useAppStore
      .getState()
      .bookings.filter((b) => b.caseId === id && b.kind === 'reparatur');
    expect(repairs.map((b) => b.status)).toEqual(['erledigt', 'angefragt']);
    // Die zweite Runde läuft bis zur Frage, ob das Gerät wieder läuft
    for (let i = 0; i < 4; i++) {
      await act(async () => {
        useAppStore.getState().simulateNext(id);
      });
    }
    expect(caseOf(id).status).toBe('in_reparatur');
    expect(screen.getByTestId('antwort-laeuft')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('antwort-laeuft'));
    expect(caseOf(id)).toMatchObject({ status: 'erledigt', resolution: 'repariert' });
  });

  test('läuft für das Gerät schon ein neuer Fall, öffnet sich der erledigte nicht wieder (Nr. 13)', async () => {
    const { id } = await repaired();
    await tap(de.finish.runsAgain);
    const deviceId = caseOf(id).deviceId;
    await act(async () => {
      useAppStore.getState().openCaseFor(deviceId, 'symptom', 'Tür geht nicht auf');
    });
    expect(screen.queryByRole('button', { name: de.finish.stillBroken })).toBeNull();
    expect(useAppStore.getState().confirmRepair(id, false)).toEqual({
      ok: false,
      refusal: { code: 'regel', action: 'problem_besteht_weiter' },
    });
    expect(caseOf(id).status).toBe('erledigt');
  });

  // Seit Nr. 32 öffnet er sich in der Gewährleistung als Nachbesserung, ohne neue Meldung
  test('auch nach „Läuft wieder“ lässt sich ein erledigter Fall wieder öffnen', async () => {
    const { id, r } = await repaired();
    await tap(de.finish.runsAgain);
    await tap(de.finish.stillBroken);
    expect(caseOf(id).status).toBe('nachbesserung');
    expect(caseOf(id).closedAt).toBeUndefined();
    expect(caseOf(id).claim).toBeUndefined();
    expect(caseOf(id).rework?.repairBookingId).toBe(caseOf(id).rounds?.[0]?.bookingIds[0]);
    expect(r.getPathname()).toBe(`/fall/${id}`);
  });
});

describe('Status aus den Fakten', () => {
  const view = (id: string) => statusView(useAppStore.getState(), caseOf(id));

  test('abgelehnt: Entscheidung bei dir, der Termin vorbehaltlich Freigabe ist verfallen', async () => {
    const { id } = await bookedCase('ablehnen');
    expect(bookingOf(id)).toMatchObject({ status: 'angefragt', subjectToApproval: true });
    await act(async () => {
      useAppStore.getState().simulateNext(id);
    });
    const v = view(id);
    expect(v.headline).toBe(de.status.headline.abgelehnt('Kranich'));
    expect(v.next).toBe('kosten');
    expect(v.timeline.map((x) => x.what)).not.toContain(de.status.timeline.angefragt);
    expect(v.text).toBeUndefined();
  });

  test('geschlossen: erledigt und abgebrochen', async () => {
    const { id } = await bookedCase();
    const s = useAppStore.getState();
    let done = caseOf(id);
    act(() => {
      done = s.createCase({
        deviceId: caseOf(id).deviceId,
        entry: 'symptom',
        problemLabel: 'Tür geht nicht auf',
      });
      s.runCommand(done.id, 'anleitung_starten');
      s.runCommand(done.id, 'selbst_geloest');
      s.runCommand(id, 'abbrechen', { cancelReason: de.closeCase.reasons[0] });
    });
    expect(view(done.id).headline).toBe(de.status.headline.erledigt);
    expect(view(id).headline).toBe(de.status.headline.abgebrochen);
  });

  test('erledigt bleibt erledigt, auch wenn für das Gerät schon ein neuer Fall offen ist', () => {
    const s = useAppStore.getState();
    s.reset();
    const device = s.addDevice({
      manufacturerId: 'miele',
      category: 'waschmaschine',
      model: 'WKB 130',
      identifiedBy: 'manuell',
    });
    const done = s.createCase({ deviceId: device.id, entry: 'symptom', problemLabel: 'nass' });
    s.runCommand(done.id, 'anleitung_starten');
    s.runCommand(done.id, 'selbst_geloest');
    s.createCase({ deviceId: device.id, entry: 'symptom', problemLabel: 'Tür geht nicht auf' });
    expect(caseOf(done.id).status).toBe('erledigt');
    // Wieder öffnen geht gerade nicht, der Fall ist trotzdem erledigt und nicht abgebrochen
    expect(view(done.id).headline).toBe(de.status.headline.erledigt);
  });
});
