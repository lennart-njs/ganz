import { useWindowDimensions } from 'react-native';

import { useTheme } from '@/theme';

/** Wahr ab 150 % Schrift. Dann stapeln Zeilen ihre Spalten untereinander. */
export function useLargeText(): boolean {
  const { fontScale } = useWindowDimensions();
  const theme = useTheme();
  return (theme.previewFontScale ?? fontScale) >= 1.5;
}
