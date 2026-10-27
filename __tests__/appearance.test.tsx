import { StyleSheet } from 'react-native';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { de } from '@/i18n/de';
import { useAppStore } from '@/store/appStore';
import { colors } from '@/theme/colors';

const t = de.profile;

/** Hintergrundfarben aller gerenderten Views */
const backgrounds = () =>
  screen.container
    .queryAll((n) => n.type === 'View')
    .map((n) => StyleSheet.flatten(n.props.style)?.backgroundColor)
    .filter(Boolean);

beforeEach(() => {
  useAppStore.getState().reset();
  useAppStore.setState({ onboardingDone: true, appearance: 'system' });
});

describe('Darstellung', () => {
  test('im Profil wählbar: Wie System, Hell, Dunkel', async () => {
    await renderRouter('./app', { initialUrl: '/profil' });
    expect(screen.getByRole('radio', { name: t.appearanceOptions.system })).toBeChecked();
    await fireEvent.press(screen.getByRole('radio', { name: t.appearanceOptions.dunkel }));
    expect(useAppStore.getState().appearance).toBe('dunkel');
    expect(backgrounds()[0]).toBe(colors.dark.bgPage);

    await fireEvent.press(screen.getByRole('radio', { name: t.appearanceOptions.hell }));
    expect(useAppStore.getState().appearance).toBe('hell');
    expect(backgrounds()[0]).toBe(colors.light.bgPage);
  });

  test('Zurücksetzen behält die Darstellung', () => {
    useAppStore.getState().setAppearance('hell');
    useAppStore.getState().reset();
    expect(useAppStore.getState().appearance).toBe('hell');
  });
});
