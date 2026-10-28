import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { maxFontScale, useTheme, type ThemeColors, type TypeRoleName } from '@/theme';

export type TextTone =
  | 'strong'
  | 'body'
  | 'muted'
  | 'onInverse'
  | 'onInverseMuted'
  | 'onPrimary'
  | 'onPhoto'
  | 'onDanger'
  | 'photoInk'
  | 'inverted'
  | 'danger';

const toneColor: Record<TextTone, keyof ThemeColors> = {
  strong: 'textStrong',
  body: 'textBody',
  muted: 'textMuted',
  onInverse: 'textOnInverse',
  onInverseMuted: 'textOnInverseMuted',
  onPrimary: 'actionOnPrimary',
  onPhoto: 'onPhoto',
  onDanger: 'actionOnDanger',
  photoInk: 'photoInk',
  /** Text auf dem Inverse-Button (heller Button auf dunklem Block) */
  inverted: 'surfaceInverse',
  danger: 'actionDanger',
};

export interface TextProps extends RNTextProps {
  variant?: TypeRoleName;
  tone?: TextTone;
  align?: 'left' | 'center' | 'right';
}

function defaultTone(variant: TypeRoleName): TextTone {
  if (variant === 'meta' || variant === 'caption' || variant === 'hint') return 'muted';
  if (variant === 'body' || variant === 'bodyLg') return 'body';
  return 'strong';
}

/** Einziger Weg, Text zu setzen. Skaliert mit der Systemschrift bis 200 %. */
export function Text({ variant = 'body', tone, align, style, ...rest }: TextProps) {
  const theme = useTheme();
  const role = theme.typeRoles[variant];
  const scale = theme.previewFontScale ?? 1;
  const fontSize = role.fontSize * scale;
  const tracking = 'tracking' in role ? role.tracking : 0;
  const color = theme.colors[toneColor[tone ?? defaultTone(variant)]];
  return (
    <RNText
      allowFontScaling={theme.previewFontScale === undefined}
      maxFontSizeMultiplier={maxFontScale}
      style={[
        {
          fontFamily: theme.fontFamily[role.weight],
          fontSize,
          lineHeight: Math.round(fontSize * role.lineHeight),
          letterSpacing: tracking * fontSize,
          color,
          textAlign: align,
        },
        style,
      ]}
      {...rest}
    />
  );
}
