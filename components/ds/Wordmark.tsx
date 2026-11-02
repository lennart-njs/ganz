import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { de } from '@/i18n/de';
import { useTheme, wordmarkRatio, wordmarkXml } from '@/theme';

/**
 * Wortmarke „mach’s“ aus der Logo-Datei des Designsystems (Pfade, nicht aus der Schrift gesetzt).
 * `size` ist die Schriftgröße, die die Wortmarke ungefähr hätte. Farbe immer ink.
 */
export function Wordmark({ size = 28 }: { size?: number }) {
  const theme = useTheme();
  const height = size * (theme.previewFontScale ?? 1);
  return (
    <View accessible accessibilityRole="header" accessibilityLabel={de.app.name}>
      <SvgXml
        xml={wordmarkXml(theme.colors.textStrong)}
        height={height}
        width={height * wordmarkRatio}
      />
    </View>
  );
}
