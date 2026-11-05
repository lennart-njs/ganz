// Antworten unten im Gespräch klappen beim Hochscrollen ein und kommen beim Herunterscrollen
// wieder (Entscheidung 38). Die Regel ist rein (components/ds/scrollCollapse.ts), Screen misst.
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import * as RN from 'react-native';

import { NEAR_END, SCROLL_STEP, nextCollapsed } from '@/components/ds/scrollCollapse';
import { de } from '@/i18n/de';
import { useAppStore } from '@/store/appStore';
import { APP } from '@/test/app';
import { addWasher, start } from '@/test/regressions';

const t = de.talk;
const far = 2000;

describe('nextCollapsed', () => {
  const move = (dy: number, fromEnd = far, canScroll = true) => ({ dy, fromEnd, canScroll });

  test('hoch klappt ein, runter zeigt wieder', () => {
    expect(nextCollapsed(false, move(-SCROLL_STEP))).toBe(true);
    expect(nextCollapsed(true, move(SCROLL_STEP))).toBe(false);
  });

  test('kleines Zittern ändert nichts', () => {
    for (const collapsed of [false, true]) {
      expect(nextCollapsed(collapsed, move(-(SCROLL_STEP - 1)))).toBe(collapsed);
      expect(nextCollapsed(collapsed, move(SCROLL_STEP - 1))).toBe(collapsed);
    }
  });

  test('langsam runter bis ans Ende zeigt die Antworten', () => {
    expect(nextCollapsed(true, move(1, NEAR_END))).toBe(false);
    expect(nextCollapsed(true, move(1, 0))).toBe(false);
  });

  test('ganz unten oder ohne Scrollen klappt hoch nichts ein', () => {
    expect(nextCollapsed(false, move(-50, NEAR_END))).toBe(false);
    expect(nextCollapsed(false, move(-50, far, false))).toBe(false);
  });

  // Klappt die Liste ein, wird der Inhalt höher, und man ist plötzlich „unten“. Der Browser meldet
  // dazu ein Scrollen ohne Bewegung. Gefunden im Browser: Die Liste sprang sofort wieder auf.
  test('ein Scrollen ohne Bewegung ändert nichts, auch nah am Ende', () => {
    for (const collapsed of [false, true]) {
      expect(nextCollapsed(collapsed, move(0, 0))).toBe(collapsed);
      expect(nextCollapsed(collapsed, move(0, 10, false))).toBe(collapsed);
    }
  });
});

describe('Gespräch: Antworten beim Scrollen', () => {
  /** Ein Fall mit Ergebnis: unten stehen „Anleitung starten“ und weitere Antworten */
  async function openCase() {
    start();
    const c = useAppStore.getState().createCase({
      deviceId: addWasher().id,
      entry: 'freitext',
      problemLabel: 'Es pumpt nicht ab.',
    });
    useAppStore.getState().escalate(c.id);
    await renderRouter(APP, { initialUrl: `/fall/${c.id}` });
    return c.id;
  }

  /** Der scrollende Inhalt des Screens */
  const scroller = () =>
    screen.container.queryAll(
      (n) => typeof n.props.onScroll === 'function' && !!n.props.children,
    )[0]!;

  const scrollTo = async (y: number) => {
    await fireEvent.scroll(scroller(), {
      nativeEvent: {
        contentOffset: { x: 0, y },
        contentSize: { width: 390, height: 3000 },
        layoutMeasurement: { width: 390, height: 600 },
      },
    });
  };

  const replyButtons = () => screen.queryAllByTestId(/^antwort-/);

  test('hoch: eine Zeile statt der Liste, das Eingabefeld bleibt; runter: die Liste kommt wieder', async () => {
    await openCase();
    const before = replyButtons().length;
    expect(before).toBeGreaterThan(0);

    await scrollTo(1500);
    await scrollTo(1000);
    expect(replyButtons()).toEqual([]);
    const pill = screen.getByRole('button', { name: t.repliesShow(before) });
    expect(screen.getByText(t.repliesCollapsed(before))).toBeTruthy();
    expect(screen.getByLabelText(de.thread.inputLabel)).toBeTruthy();
    // 44 pt Trefferfläche
    expect(RN.StyleSheet.flatten(pill.props.style).minHeight).toBeGreaterThanOrEqual(44);

    await scrollTo(1200);
    expect(replyButtons()).toHaveLength(before);
    expect(screen.queryByRole('button', { name: t.repliesShow(before) })).toBeNull();
  });

  test('ein Tap auf die Zeile zeigt die Liste wieder', async () => {
    await openCase();
    const before = replyButtons().length;
    await scrollTo(1500);
    await scrollTo(900);
    await fireEvent.press(screen.getByRole('button', { name: t.repliesShow(before) }));
    expect(replyButtons()).toHaveLength(before);
  });

  test('mit Screenreader klappt nichts weg', async () => {
    const reader = jest
      .spyOn(RN.AccessibilityInfo, 'isScreenReaderEnabled')
      .mockResolvedValue(true);
    await openCase();
    await act(async () => {});
    const before = replyButtons().length;
    await scrollTo(1500);
    await scrollTo(900);
    expect(replyButtons()).toHaveLength(before);
    reader.mockRestore();
  });
});
