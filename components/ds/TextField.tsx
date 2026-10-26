import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { maxFontScale, useTheme } from '@/theme';

import { Text } from './Text';

interface TextFieldProps extends Omit<TextInputProps, 'style' | 'placeholderTextColor'> {
  label: string;
  hint?: string;
  /** Fehlertext. Wird angesagt und steht unter dem Feld, nicht nur als Farbe. */
  error?: string;
  multiline?: boolean;
  rows?: number;
}

export function TextField({ label, hint, error, multiline, rows = 4, ...rest }: TextFieldProps) {
  const theme = useTheme();
  const [focus, setFocus] = useState(false);
  const scale = theme.previewFontScale ?? 1;
  const fontSize = theme.typeRoles.bodyLg.fontSize * scale;
  const borderColor = focus || error ? theme.colors.textStrong : theme.colors.borderControl;
  return (
    <View style={styles.wrap}>
      <Text variant="meta" tone="muted" nativeID={`${label}-label`}>
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error ?? hint}
        accessibilityLabelledBy={`${label}-label`}
        allowFontScaling={theme.previewFontScale === undefined}
        maxFontSizeMultiplier={maxFontScale}
        placeholderTextColor={theme.colors.textPlaceholder}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        onFocus={(e) => {
          setFocus(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocus(false);
          rest.onBlur?.(e);
        }}
        {...rest}
        style={{
          fontFamily: theme.fontFamily.regular,
          fontSize,
          color: theme.colors.textStrong,
          backgroundColor: theme.colors.surfaceCard,
          borderWidth: focus || error ? 2 : 1,
          borderColor,
          borderRadius: theme.radius.sm,
          paddingHorizontal: focus || error ? 13 : 14,
          paddingVertical: multiline ? 12 : 10,
          minHeight: multiline ? Math.round(fontSize * 1.4 * rows) + 24 : theme.size.control,
        }}
      />
      {error ? (
        <Text
          variant="meta"
          tone="strong"
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
        >
          {error}
        </Text>
      ) : hint ? (
        <Text variant="meta">{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
});
