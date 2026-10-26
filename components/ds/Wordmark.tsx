import { de } from '@/i18n/de';
import { maxFontScale, useTheme } from '@/theme';

import { Text } from './Text';

/** Wortmarke „ganz“: Schibsted Grotesk 600, Tracking -0.03em. Es gibt kein Logo. */
export function Wordmark({ size = 24, inverse = false }: { size?: number; inverse?: boolean }) {
  const theme = useTheme();
  const fontSize = size * (theme.previewFontScale ?? 1);
  return (
    <Text
      accessibilityRole="header"
      tone={inverse ? 'onInverse' : 'strong'}
      maxFontSizeMultiplier={maxFontScale}
      style={{
        fontFamily: theme.fontFamily.semibold,
        fontSize,
        lineHeight: Math.round(fontSize * 1.1),
        letterSpacing: -0.03 * fontSize,
      }}
    >
      {de.app.name}
    </Text>
  );
}
