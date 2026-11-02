import { palette as p } from './palette';

export type ColorScheme = 'light' | 'dark';

export interface ThemeColors {
  /** Grund jedes Screens */
  bgPage: string;
  /** Karten, Listen, Eingabefelder */
  surfaceCard: string;
  /** Info-Box, Schiene der Segmente, Foto-Platzhalter */
  surfaceMuted: string;
  /** Gewähltes Segment */
  surfaceRaised: string;
  /** Dunkle Blöcke: Sicherheit, Abschluss, Toast */
  surfaceInverse: string;
  textStrong: string;
  textBody: string;
  textMuted: string;
  /** Nur für Platzhalter in Feldern, nie für Infotext (B-45) */
  textPlaceholder: string;
  textOnInverse: string;
  textOnInverseMuted: string;
  /** Linien in Karten */
  borderSubtle: string;
  /** Linien auf der Seite, nicht gewählte Auswahl */
  borderDefault: string;
  /** Rahmen für Bedienelemente, mindestens 3 : 1 (B-44) */
  borderControl: string;
  actionPrimary: string;
  actionPrimaryPressed: string;
  actionOnPrimary: string;
  /** Fläche des Secondary Buttons (mach’s accent-soft) */
  actionSoft: string;
  /** Nur für Auflegen und Zerstörendes */
  actionDanger: string;
  actionOnDanger: string;
  focus: string;
  /** Scrim über Fotos und Video */
  scrim: string;
  /** Hintergrund hinter Sheets */
  backdrop: string;
  /** Schatten schwebender Karten */
  shadow: string;
  /** Text und Linien auf Fotos und Kamera, in beiden Modi hell */
  onPhoto: string;
  /** Dunkle Schrift auf hellen Flächen über Fotos, in beiden Modi dunkel */
  photoInk: string;
}

export const colors: Record<ColorScheme, ThemeColors> = {
  // mach’s: weißer Grund, graue Flächen ordnen, Blaumann-Blau ist die einzige Signalfarbe
  light: {
    bgPage: p.white,
    surfaceCard: p.sunken,
    surfaceMuted: p.sunken,
    surfaceRaised: p.white,
    surfaceInverse: p.ink,
    textStrong: p.ink,
    textBody: p.body,
    textMuted: p.muted,
    textPlaceholder: p.placeholder,
    textOnInverse: p.inkSoft,
    textOnInverseMuted: p.inkSoftMuted,
    borderSubtle: p.line,
    borderDefault: p.line2,
    borderControl: p.borderControl,
    actionPrimary: p.accent,
    actionPrimaryPressed: p.accentPressed,
    actionOnPrimary: p.white,
    actionSoft: p.accentSoft,
    actionDanger: p.danger,
    actionOnDanger: p.white,
    focus: p.accent,
    scrim: 'rgba(22,24,26,0.78)',
    backdrop: 'rgba(22,24,26,0.4)',
    shadow: p.ink,
    onPhoto: p.white,
    photoInk: p.ink,
  },
  dark: {
    bgPage: p.darkBg,
    surfaceCard: p.darkSunken,
    surfaceMuted: p.darkSunken,
    surfaceRaised: p.darkLine,
    surfaceInverse: p.darkInk,
    textStrong: p.darkInk,
    textBody: p.darkBody,
    textMuted: p.darkMuted,
    textPlaceholder: p.darkPlaceholder,
    textOnInverse: p.ink,
    textOnInverseMuted: p.body,
    borderSubtle: p.darkLine,
    borderDefault: p.darkLine2,
    borderControl: p.darkPlaceholder,
    actionPrimary: p.darkAccent,
    actionPrimaryPressed: p.darkAccentPressed,
    actionOnPrimary: p.darkBg,
    actionSoft: p.darkAccentSoft,
    actionDanger: p.darkDanger,
    actionOnDanger: p.darkBg,
    focus: p.darkAccent,
    scrim: 'rgba(15,17,18,0.78)',
    backdrop: 'rgba(0,0,0,0.6)',
    shadow: p.darkPage,
    onPhoto: p.white,
    photoInk: p.ink,
  },
};
