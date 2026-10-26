// Rohfarben aus design-system/tokens/colors.css und den Dark-Werten aus docs/AUFTRAG.md.
// Nur theme/ darf Hex-Werte enthalten.
export const palette = {
  ink900: '#16181A',
  ink700: '#3C3F43',
  ink500: '#5C5F63',
  ink400: '#7E8084',
  ink300: '#8A8C8F',
  stone400: '#BDBBB4',
  stone300: '#D8D6CF',
  stone200: '#E6E4DE',
  stone150: '#E9E7E1',
  stone100: '#F5F4F0',
  white: '#FFFFFF',
  fog100: '#F5F4F0',
  fog200: '#EDECE7',
  fog300: '#D6D5D0',
  fog400: '#A9A8A3',
  red600: '#C8372D',
  // Dark-Ergänzungen aus dem Auftrag (Abschnitt 5)
  night950: '#0F1112',
  night850: '#202326',
  night800: '#2C2F33',
  red500: '#E5564B',
} as const;
