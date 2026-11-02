// Eingabefeld des Gesprächs: Text mit Senden-Pfeil im Feld (wie in Messengern), links optional die Kamera.
// Der Platzhalter sagt, dass hier der Reparatur-Assistent antwortet. Das Feld wächst mit dem Text.
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, Text } from '@/components/ds';
import { maxFontScale, useTheme } from '@/theme';

import { IconButton } from './Conversation';

interface ChatInputProps {
  /** Beschriftung für den Screenreader */
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  onSend: () => void;
  sendLabel: string;
  /** Senden möglich, auch ohne Text (z. B. mit Foto) */
  canSend: boolean;
  error?: string;
  /** Zeile über dem Feld, z. B. „Foto angehängt“ */
  above?: React.ReactNode;
  camera?: { label: string; onPress: () => void; disabled?: boolean };
}

export function ChatInput({
  label,
  placeholder,
  value,
  onChangeText,
  onSend,
  sendLabel,
  canSend,
  error,
  above,
  camera,
}: ChatInputProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [focus, setFocus] = useState(false);
  const fontSize = theme.typeRoles.bodyLg.fontSize * (theme.previewFontScale ?? 1);
  return (
    <View
      style={[
        styles.bar,
        {
          paddingBottom: Math.max(insets.bottom, 12) + 8,
          paddingHorizontal: theme.gutter,
          borderTopColor: theme.colors.borderSubtle,
          backgroundColor: theme.colors.bgPage,
        },
      ]}
    >
      {above}
      <View style={styles.row}>
        {camera ? (
          <IconButton
            icon="camera"
            label={camera.label}
            disabled={camera.disabled}
            onPress={camera.onPress}
          />
        ) : null}
        <View
          style={[
            styles.field,
            {
              backgroundColor: theme.colors.surfaceCard,
              borderRadius: theme.radius.pill,
              borderColor: error
                ? theme.colors.actionDanger
                : focus
                  ? theme.colors.focus
                  : theme.colors.surfaceCard,
            },
          ]}
        >
          <TextInput
            accessibilityLabel={label}
            accessibilityHint={error}
            allowFontScaling={theme.previewFontScale === undefined}
            maxFontSizeMultiplier={maxFontScale}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.textPlaceholder}
            multiline
            value={value}
            onChangeText={onChangeText}
            onFocus={() => setFocus(true)}
            onBlur={() => setFocus(false)}
            style={[
              styles.input,
              {
                fontFamily: theme.fontFamily.regular,
                fontSize,
                color: theme.colors.textStrong,
                minHeight: theme.size.hitMin,
              },
            ]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={sendLabel}
            accessibilityState={{ disabled: !canSend }}
            disabled={!canSend}
            onPress={onSend}
            style={({ pressed }) => [
              styles.send,
              {
                borderRadius: theme.radius.pill,
                backgroundColor: canSend
                  ? pressed
                    ? theme.colors.actionPrimaryPressed
                    : theme.colors.actionPrimary
                  : theme.colors.borderSubtle,
              },
            ]}
          >
            <Icon name="send" size={20} color={canSend ? 'actionOnPrimary' : 'textMuted'} />
          </Pressable>
        </View>
      </View>
      {error ? (
        <Text
          variant="meta"
          tone="strong"
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { gap: 6, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 2,
    paddingLeft: 16,
    paddingRight: 4,
  },
  input: { flex: 1, maxHeight: 140, paddingTop: 10, paddingBottom: 10 },
  send: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
