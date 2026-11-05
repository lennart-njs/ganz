// Aufklappbare Bereiche sind Kacheln mit grauem Rahmen, der Schalter ist Plus und Minus statt des
// Pfeils (Entscheidung 38). Gilt für Section und Disclosure, also überall in der App.
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { Disclosure, Section, Text } from '@/components/ds';
import { de } from '@/i18n/de';
import { colors } from '@/theme/colors';

/** Die Kachel um den Kopf: die nächste Fläche mit Rahmen */
function tileOf(button: ReturnType<typeof screen.getByRole>) {
  let node = button.parent;
  while (node && !(StyleSheet.flatten(node.props.style)?.borderWidth > 0)) node = node.parent;
  return node ? StyleSheet.flatten(node.props.style) : undefined;
}

describe.each([
  [
    'Section',
    () => (
      <Section title="Datenschutz" summary="2 aktiv">
        <Text>Inhalt</Text>
      </Section>
    ),
    de.a11y.withSub('Datenschutz', '2 aktiv'),
  ],
  [
    'Disclosure',
    () => (
      <Disclosure title="Das geht an Kranich">
        <Text>Inhalt</Text>
      </Disclosure>
    ),
    'Das geht an Kranich',
  ],
] as const)('%s', (_, ui, name) => {
  test('eine Kachel mit grauem Rahmen, Kopf ab 44 pt', async () => {
    await render(ui());
    const head = screen.getByRole('button', { name });
    const tile = tileOf(head);
    expect(tile).toMatchObject({ borderWidth: 1, borderColor: colors.light.borderDefault });
    expect(tile?.borderRadius).toBeGreaterThan(0);
    expect(StyleSheet.flatten(head.props.style).minHeight).toBeGreaterThanOrEqual(44);
  });

  test('zu: Plus, offen: Minus, der Inhalt in derselben Kachel', async () => {
    await render(ui());
    const head = screen.getByRole('button', { name });
    expect(head.props.accessibilityState).toMatchObject({ expanded: false });
    expect(screen.getByTestId('kachel-zu')).toBeTruthy();
    expect(screen.queryByText('Inhalt')).toBeNull();
    await fireEvent.press(head);
    const open = screen.getByRole('button', { name });
    expect(open.props.accessibilityState).toMatchObject({ expanded: true });
    expect(screen.getByTestId('kachel-offen')).toBeTruthy();
    expect(screen.queryByTestId('kachel-zu')).toBeNull();
    expect(screen.getByText('Inhalt')).toBeTruthy();
    expect(open.props.accessibilityHint).toBe(de.ds.collapse);
  });
});
