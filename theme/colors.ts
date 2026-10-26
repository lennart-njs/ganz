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
  light: {
    bgPage: p.stone100,
    surfaceCard: p.white,
    surfaceMuted: p.stone150,
    surfaceRaised: p.white,
    surfaceInverse: p.ink900,
    textStrong: p.ink900,
    textBody: p.ink700,
    textMuted: p.ink500,
    textPlaceholder: p.ink300,
    textOnInverse: p.fog100,
    textOnInverseMuted: p.fog300,
    borderSubtle: p.stone200,
    borderDefault: p.stone300,
    borderControl: p.ink300,
    actionPrimary: p.ink900,
    actionPrimaryPressed: p.ink700,
    actionOnPrimary: p.fog100,
    actionDanger: p.red600,
    actionOnDanger: p.white,
    focus: p.ink900,
    scrim: 'rgba(22,24,26,0.78)',
    backdrop: 'rgba(22,24,26,0.45)',
    shadow: p.ink900,
    onPhoto: p.white,
    photoInk: p.ink900,
  },
  dark: {
    bgPage: p.ink900,
    surfaceCard: p.night850,
    surfaceMuted: p.night800,
    surfaceRaised: p.ink700,
    surfaceInverse: p.fog100,
    textStrong: p.fog100,
    textBody: p.fog300,
    textMuted: p.fog400,
    textPlaceholder: p.ink400,
    textOnInverse: p.ink900,
    textOnInverseMuted: p.ink700,
    borderSubtle: p.night800,
    borderDefault: p.ink700,
    borderControl: p.ink400,
    actionPrimary: p.fog100,
    actionPrimaryPressed: p.fog300,
    actionOnPrimary: p.ink900,
    actionDanger: p.red500,
    actionOnDanger: p.ink900,
    focus: p.fog100,
    scrim: 'rgba(15,17,18,0.78)',
    backdrop: 'rgba(0,0,0,0.6)',
    shadow: p.night950,
    onPhoto: p.white,
    photoInk: p.ink900,
  },
};
