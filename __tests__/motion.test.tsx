import { AccessibilityInfo } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { AddMenu } from '@/components/app/AddMenu';
import { Section, Sheet, Text } from '@/components/ds';
import { de } from '@/i18n/de';
import { ThemeProvider } from '@/theme';

const wrap = (node: React.ReactNode) => render(<ThemeProvider>{node}</ThemeProvider>);
/** animationType aller Modals im Baum */
const modalAnimations = () =>
  [...JSON.stringify(screen.toJSON()).matchAll(/"animationType":"(\w+)"/g)].map((m) => m[1]);

function reduceMotion(on: boolean) {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(on);
}

afterEach(() => jest.restoreAllMocks());

describe('Animationen und „Bewegung reduzieren“', () => {
  test('Sheet: Hintergrund blendet ein, ohne „Bewegung reduzieren“', async () => {
    reduceMotion(false);
    await wrap(
      <Sheet visible onClose={() => undefined} title="Titel">
        <Text>Inhalt</Text>
      </Sheet>,
    );
    await act(async () => {});
    expect(modalAnimations()).toEqual(['fade']);
  });

  test('Sheet: mit „Bewegung reduzieren“ ohne Übergang', async () => {
    reduceMotion(true);
    await wrap(
      <>
        <Sheet visible onClose={() => undefined} title="Titel">
          <Text>Inhalt</Text>
        </Sheet>
        <AddMenu items={[{ key: 'a', label: 'Eintrag', onPress: () => undefined }]} />
      </>,
    );
    await act(async () => {});
    expect(modalAnimations()).toEqual(['none']);
  });

  test('Plus-Menü: offen liegt ein X an der Stelle des Plus, ein Tap schließt', async () => {
    reduceMotion(false);
    const onPress = jest.fn();
    await wrap(<AddMenu items={[{ key: 'a', label: 'Eintrag', onPress }]} />);
    await fireEvent.press(screen.getByRole('button', { name: de.home.addMenu }));
    expect(screen.getByRole('menuitem', { name: 'Eintrag' })).toBeTruthy();
    const closers = screen.getAllByRole('button', { name: de.a11y.close });
    // Abdunklung und X
    expect(closers).toHaveLength(2);
    await fireEvent.press(closers[1]!);
    expect(screen.queryByRole('menuitem', { name: 'Eintrag' })).toBeNull();
  });

  test('Abschnitt klappt auf und zu, der Zustand wird angesagt', async () => {
    await wrap(
      <Section title="Pflege" summary="3 Anleitungen">
        <Text>Inhalt</Text>
      </Section>,
    );
    const head = screen.getByRole('button', { name: /^Pflege/ });
    expect(head.props.accessibilityState).toMatchObject({ expanded: false });
    await fireEvent.press(head);
    expect(screen.getByText('Inhalt')).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Pflege/ }).props.accessibilityState).toMatchObject({
      expanded: true,
    });
  });
});
