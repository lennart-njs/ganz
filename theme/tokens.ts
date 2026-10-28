// Abstände, Radien, Größen und Typo aus design-system/tokens/*.css.
export const space = {
  1: 4,
  2: 6,
  3: 8,
  4: 10,
  5: 12,
  6: 14,
  7: 16,
  8: 20,
  9: 24,
  10: 28,
  11: 32,
  12: 40,
  13: 56,
} as const;

/** Seitenrand in der App (Designsystem: 20 px) */
export const gutter = space[8];

export const radius = {
  xs: 4,
  check: 5,
  /** Buttons, Eingabefelder, Chips */
  sm: 8,
  segment: 9,
  md: 10,
  /** Fotos */
  media: 12,
  /** Karten */
  lg: 14,
  pill: 999,
} as const;

export const size = {
  /** Mindestgröße jeder Trefferfläche (WCAG 2.5.8, HIG) */
  hitMin: 44,
  control: 50,
  controlLg: 52,
  hairline: 1,
} as const;

export const fontFamily = {
  regular: 'SchibstedGrotesk_400Regular',
  medium: 'SchibstedGrotesk_500Medium',
  semibold: 'SchibstedGrotesk_600SemiBold',
  bold: 'SchibstedGrotesk_700Bold',
} as const;

export type FontWeightName = keyof typeof fontFamily;

export interface TypeRole {
  fontSize: number;
  lineHeight: number;
  weight: FontWeightName;
  /** Tracking in em, wird in px umgerechnet */
  tracking?: number;
}

/** Typo-Rollen. Alle skalieren mit der Systemschrift bis Faktor 2. */
export const typeRoles = {
  display: { fontSize: 34, lineHeight: 1.08, weight: 'medium', tracking: -0.03 },
  h1: { fontSize: 28, lineHeight: 1.12, weight: 'medium', tracking: -0.02 },
  title: { fontSize: 20, lineHeight: 1.3, weight: 'semibold' },
  /** Gespräch: was ganz sagt, Antwort-Buttons. Gleiche Größe wie die Antwort des Haushalts. */
  say: { fontSize: 17, lineHeight: 1.4, weight: 'medium', tracking: -0.005 },
  /** Gespräch: Antwort des Haushalts in der Tintenblase */
  bubble: { fontSize: 17, lineHeight: 1.4, weight: 'regular' },
  /** Gespräch: Erklärung unter einer Nachricht */
  hint: { fontSize: 15, lineHeight: 1.45, weight: 'regular' },
  bodyLg: { fontSize: 17, lineHeight: 1.45, weight: 'regular' },
  body: { fontSize: 16, lineHeight: 1.45, weight: 'regular' },
  label: { fontSize: 16, lineHeight: 1.25, weight: 'medium' },
  labelStrong: { fontSize: 16, lineHeight: 1.3, weight: 'semibold' },
  meta: { fontSize: 14, lineHeight: 1.4, weight: 'regular' },
  caption: { fontSize: 13, lineHeight: 1.4, weight: 'regular' },
  tab: { fontSize: 12, lineHeight: 1.3, weight: 'medium' },
} as const satisfies Record<string, TypeRole>;

export type TypeRoleName = keyof typeof typeRoles;

/** Obergrenze für Dynamic Type (200 %) */
export const maxFontScale = 2;

export const motion = {
  fade: 200,
  /** Neue Nachricht im Gespräch: einblenden und 8 pt nach oben */
  message: 220,
} as const;
