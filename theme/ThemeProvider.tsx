import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { colors, type ColorScheme, type ThemeColors } from './colors';
import { fontFamily, gutter, radius, size, space, typeRoles } from './tokens';

export interface Theme {
  scheme: ColorScheme;
  colors: ThemeColors;
  space: typeof space;
  gutter: number;
  radius: typeof radius;
  size: typeof size;
  fontFamily: typeof fontFamily;
  typeRoles: typeof typeRoles;
  /** Nur Vorschau in der Galerie: feste Schriftskalierung statt Systemwert */
  previewFontScale?: number;
}

function buildTheme(scheme: ColorScheme, previewFontScale?: number): Theme {
  return {
    scheme,
    colors: colors[scheme],
    space,
    gutter,
    radius,
    size,
    fontFamily,
    typeRoles,
    previewFontScale,
  };
}

const ThemeContext = createContext<Theme>(buildTheme('light'));

interface ThemeProviderProps {
  children: ReactNode;
  /** Ohne Angabe folgt das Theme dem System. */
  scheme?: ColorScheme;
  previewFontScale?: number;
}

export function ThemeProvider({ children, scheme, previewFontScale }: ThemeProviderProps) {
  const system = useColorScheme();
  const resolved: ColorScheme = scheme ?? (system === 'dark' ? 'dark' : 'light');
  const theme = useMemo(() => buildTheme(resolved, previewFontScale), [resolved, previewFontScale]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
