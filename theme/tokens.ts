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

/**
 * mach’s: Systemschrift für Text (SF Pro, Roboto), Schibsted Grotesk 700 nur für Wortmarke,
 * große Überschrift und die eine wichtige Zahl. undefined = Systemschrift.
 */
export const fontFamily: Record<
  'regular' | 'medium' | 'semibold' | 'bold' | 'display',
  string | undefined
> = {
  regular: undefined,
  medium: undefined,
  semibold: undefined,
  bold: undefined,
  display: 'SchibstedGrotesk_700Bold',
};

/** Gewicht der Systemschrift. Die Display-Schrift bringt ihr Gewicht selbst mit. */
export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  display: undefined,
} as const;

export type FontWeightName = keyof typeof fontFamily;

export interface TypeRole {
  fontSize: number;
  lineHeight: number;
  weight: FontWeightName;
  /** Tracking in em, wird in px umgerechnet */
  tracking?: number;
}

/** Typo-Rollen nach mach’s. Alle skalieren mit der Systemschrift bis Faktor 2. */
export const typeRoles = {
  display: { fontSize: 34, lineHeight: 1.06, weight: 'display', tracking: -0.035 },
  h1: { fontSize: 30, lineHeight: 1.08, weight: 'display', tracking: -0.03 },
  title: { fontSize: 22, lineHeight: 1.2, weight: 'bold', tracking: -0.02 },
  bodyLg: { fontSize: 17, lineHeight: 1.42, weight: 'regular', tracking: -0.01 },
  body: { fontSize: 17, lineHeight: 1.42, weight: 'regular', tracking: -0.01 },
  label: { fontSize: 17, lineHeight: 1.3, weight: 'medium', tracking: -0.01 },
  labelStrong: { fontSize: 17, lineHeight: 1.3, weight: 'semibold', tracking: -0.01 },
  meta: { fontSize: 15, lineHeight: 1.35, weight: 'regular' },
  caption: { fontSize: 13, lineHeight: 1.35, weight: 'regular' },
  tab: { fontSize: 11, lineHeight: 1.2, weight: 'medium' },
} as const satisfies Record<string, TypeRole>;

export type TypeRoleName = keyof typeof typeRoles;

/** Obergrenze für Dynamic Type (200 %) */
export const maxFontScale = 2;

export const motion = {
  fade: 200,
} as const;
