import { renderHook } from '@testing-library/react-native';
import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { demoConfig } from '@/config/demo.config';
import { refusalText, TAP_LOCK_MS, TOAST_MS, useCommand } from '@/hooks/useCommand';
import { de } from '@/i18n/de';
import { ok, refuse, type Refusal, type Result } from '@/model/result';
import { useAppStore, type AppActions } from '@/store/appStore';
import { APP } from '@/test/app';
import { addWasher, caseAfterFinding, flush, photoCase, start } from '@/test/regressions';

const other: Refusal = { code: 'uebergang', from: 'in_reparatur', command: 'abbrechen' };

describe('useCommand', () => {
  test('ein Doppeltap führt den Befehl einmal aus, nach der Sperre wieder', async () => {
    const command = jest.fn((n: number) => ok(n));
    const done = jest.fn();
    const { result } = await renderHook(() => useCommand(command, done));
    await act(async () => {
      result.current.run(1);
      result.current.run(2);
    });
    expect(command).toHaveBeenCalledTimes(1);
    expect(done).toHaveBeenCalledWith(1);
    expect(result.current.busy).toBe(true);
    await act(async () => jest.advanceTimersByTime(TAP_LOCK_MS));
    expect(result.current.busy).toBe(false);
    await act(async () => result.current.run(3));
    expect(command).toHaveBeenCalledTimes(2);
    expect(done).toHaveBeenLastCalledWith(3);
  });

  test('eine Ablehnung zeigt einen ruhigen Satz, nie den Fehler der Domäne', async () => {
    const done = jest.fn();
    const { result } = await renderHook(() => useCommand(() => refuse(other), done));
    await act(async () => result.current.run());
    expect(done).not.toHaveBeenCalled();
    expect(result.current.toast).toBe(de.command.refused.other);
    expect(result.current.toast).not.toMatch(/uebergang|abbrechen|in_reparatur|Übergang/);
    await act(async () => jest.advanceTimersByTime(TOAST_MS));
    expect(result.current.toast).toBeUndefined();
  });

  test('jede Ablehnung hat einen Satz aus de.command', () => {
    const cases: [Refusal, string][] = [
      [{ code: 'unbekannt', what: 'fall', id: 'GS-1' }, de.command.refused.unbekannt],
      [{ code: 'bestaetigung', purpose: 'weitergabe_fachkraft' }, de.command.refused.bestaetigung],
      [{ code: 'vertrag' }, de.command.refused.vertrag],
      [{ code: 'nur_betrieb', part: 'Laugenpumpe' }, de.command.refused.nurBetrieb],
      [{ code: 'regel', action: 'schaden_melden' }, de.command.refused.other],
      [{ code: 'schadenfall' }, de.command.refused.other],
      [other, de.command.refused.other],
    ];
    for (const [refusal, text] of cases) expect(refusalText(refusal)).toBe(text);
    for (const text of [...Object.values(de.command.refused), de.command.failed]) {
      expect(text).not.toMatch(/!/);
    }
  });

  test('ein Befehl, der wartet, sperrt bis zum Ergebnis, ein Fehlschlag bekommt den ruhigen Satz', async () => {
    let resolve: (r: Result<number>) => void = () => undefined;
    const command = jest.fn(
      () =>
        new Promise<Result<number>>((r) => {
          resolve = r;
        }),
    );
    const { result } = await renderHook(() => useCommand(command));
    await act(async () => result.current.run());
    await act(async () => jest.advanceTimersByTime(TAP_LOCK_MS * 3));
    await act(async () => result.current.run());
    expect(command).toHaveBeenCalledTimes(1);
    expect(result.current.busy).toBe(true);
    await act(async () => resolve(ok(1)));
    await act(async () => jest.advanceTimersByTime(TAP_LOCK_MS));
    expect(result.current.busy).toBe(false);

    const failing = await renderHook(() => useCommand(() => Promise.reject(new Error('Netz weg'))));
    await act(async () => failing.result.current.run());
    expect(failing.result.current.toast).toBe(de.command.failed);
  });

  test('wirft ein Befehl doch, bleibt das sichtbar, und die Sperre löst sich', async () => {
    const command = jest
      .fn<Result<number>, []>()
      .mockImplementationOnce(() => {
        throw new Error('Programmfehler');
      })
      .mockImplementation(() => ok(1));
    const { result } = await renderHook(() => useCommand(command));
    let thrown: unknown;
    await act(async () => {
      try {
        result.current.run();
      } catch (error) {
        thrown = error;
      }
    });
    expect(thrown).toEqual(new Error('Programmfehler'));
    await act(async () => result.current.run());
    expect(command).toHaveBeenCalledTimes(2);
  });
});

describe('Buttons, die nur einmal zählen', () => {
  test('Anleitung starten: ein zweiter Tap öffnet die Anleitung nicht noch einmal', async () => {
    start();
    const id = photoCase(addWasher().id);
    const r = await renderRouter(APP, { initialUrl: `/fall/${id}/ergebnis` });
    const button = screen.getByRole('button', { name: de.result.startGuide });
    await fireEvent.press(button);
    expect(r.getPathname()).toBe(`/fall/${id}/anleitung`);
    // Das Ergebnis liegt noch darunter, der Button auch. Der zweite Tap kommt vor dem Ende der Sperre.
    await fireEvent.press(button);
    expect(Object.values(useAppStore.getState().guideRuns)).toHaveLength(1);
    await act(async () => router.back());
    expect(r.getPathname()).toBe(`/fall/${id}/ergebnis`);
  });

  test('nach der Sperre zählt ein Tap wieder', async () => {
    start();
    const id = photoCase(addWasher().id);
    const r = await renderRouter(APP, { initialUrl: `/fall/${id}/ergebnis` });
    const button = screen.getByRole('button', { name: de.result.startGuide });
    await fireEvent.press(button);
    await act(async () => router.back());
    await act(async () => jest.advanceTimersByTime(TAP_LOCK_MS));
    await fireEvent.press(button);
    expect(r.getPathname()).toBe(`/fall/${id}/anleitung`);
  });

  describe('lehnt der Store ab', () => {
    let original: AppActions['requestBooking'];
    beforeEach(() => {
      original = useAppStore.getState().requestBooking;
    });
    afterEach(async () => {
      await act(async () => useAppStore.setState({ requestBooking: original }));
    });

    test('bleibt der Termin offen, mit einem ruhigen Satz statt des Fehlers', async () => {
      start();
      const id = caseAfterFinding(addWasher().id);
      useAppStore.getState().reportClaim(id, '2026-10-1');
      useAppStore.setState({
        requestBooking: () => refuse({ code: 'regel', action: 'termin_versicherer' }),
      });
      const r = await renderRouter(APP, { initialUrl: `/fall/${id}/termin?art=reparatur` });
      await fireEvent.press(screen.getByRole('radio', { name: demoConfig.slots[0] }));
      await fireEvent.press(screen.getByRole('button', { name: de.appointment.request }));
      await flush();
      expect(r.getPathname()).toBe(`/fall/${id}/termin`);
      expect(screen.getByText(de.command.refused.other)).toBeTruthy();
      expect(screen.queryByText(/termin_versicherer|regel/)).toBeNull();
      expect(useAppStore.getState().bookings).toHaveLength(0);
    });
  });
});
