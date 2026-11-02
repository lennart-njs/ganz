import { de } from '@/i18n/de';
import { maxFontScale, useTheme } from '@/theme';

import { Text } from './Text';

/** Wortmarke „mach’s“: Schibsted Grotesk 700, Tracking -0.04em, immer klein. */
export function Wordmark({ size = 24, inverse = false }: { size?: number; inverse?: boolean }) {
  const theme = useTheme();
  const fontSize = size * (theme.previewFontScale ?? 1);
  return (
    <Text
      accessibilityRole="header"
      tone={inverse ? 'onInverse' : 'strong'}
      maxFontSizeMultiplier={maxFontScale}
      style={{
        fontFamily: theme.fontFamily.display,
        fontSize,
        lineHeight: Math.round(fontSize * 1.1),
        letterSpacing: -0.04 * fontSize,
      }}
    >
      {de.app.name}
    </Text>
  );
}
