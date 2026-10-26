import { render, screen } from '@testing-library/react-native';
import * as fs from 'fs';
import * as path from 'path';
import * as RN from 'react-native';

import { Text } from '@/components/ds';
import { colors, contrastRatio, ThemeProvider, useTheme, type ColorScheme } from '@/theme';

const schemes: ColorScheme[] = ['light', 'dark'];

describe('Kontrast (WCAG 2.2 AA)', () => {
  test.each(schemes)('Text hat mindestens 4,5 : 1 (%s)', (scheme) => {
    const c = colors[scheme];
    for (const bg of [c.bgPage, c.surfaceCard, c.surfaceMuted]) {
      for (const fg of [c.textStrong, c.textBody, c.textMuted]) {
        expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
      }
    }
    expect(contrastRatio(c.textOnInverse, c.surfaceInverse)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(c.textOnInverseMuted, c.surfaceInverse)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(c.actionOnPrimary, c.actionPrimary)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(c.actionOnPrimary, c.actionPrimaryPressed)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(c.actionOnDanger, c.actionDanger)).toBeGreaterThanOrEqual(4.5);
  });

  test.each(schemes)('Rahmen von Bedienelementen haben mindestens 3 : 1 (%s, B-44)', (scheme) => {
    const c = colors[scheme];
    expect(contrastRatio(c.borderControl, c.bgPage)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(c.borderControl, c.surfaceCard)).toBeGreaterThanOrEqual(3);
  });
});

describe('Dark Mode', () => {
  function Probe() {
    const theme = useTheme();
    return <Text>{theme.scheme}</Text>;
  }

  test.each(schemes)('folgt dem System (%s)', async (scheme) => {
    const spy = jest.spyOn(RN, 'useColorScheme').mockReturnValue(scheme);
    await render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByText(scheme)).toBeTruthy();
    spy.mockRestore();
  });

  test('Text nimmt die Farbe aus dem Theme', async () => {
    jest.spyOn(RN, 'useColorScheme').mockReturnValue('dark');
    await render(
      <ThemeProvider>
        <Text>ganz</Text>
      </ThemeProvider>,
    );
    expect(screen.getByText('ganz')).toHaveStyle({ color: colors.dark.textBody });
  });
});

describe('Dynamic Type', () => {
  test('Text skaliert bis 200 % und nicht weiter', async () => {
    await render(<Text>ganz</Text>);
    const el = screen.getByText('ganz');
    expect(el.props.allowFontScaling).toBe(true);
    expect(el.props.maxFontSizeMultiplier).toBe(2);
  });
});

describe('Farben nur aus theme/', () => {
  const root = path.resolve(__dirname, '..');
  const dirs = ['app', 'components', 'i18n'];
  const files: string[] = [];
  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(entry.name)) files.push(p);
    }
  };
  dirs.forEach((d) => walk(path.join(root, d)));

  test('kein Hex-Wert außerhalb von theme/', () => {
    const offenders = files.filter((f) =>
      /['"`]#[0-9a-fA-F]{3,8}\b/.test(fs.readFileSync(f, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });
});
