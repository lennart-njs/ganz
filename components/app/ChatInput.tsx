// Eingabefeld des Gesprächs: Text mit Senden-Pfeil im Feld (wie in Messengern), links optional die Kamera.
// Der Platzhalter sagt, dass hier der Reparatur-Assistent antwortet. Das Feld wächst mit dem Text.
// Darunter steht, wohin die eigenen Worte gehen (hint), darüber optional die Wahl des Empfängers.
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, SegmentedControl, Text } from '@/components/ds';
import { maxFontScale, useTheme } from '@/theme';

import { IconButton } from './Conversation';

/** Ein möglicher Empfänger. Gesperrt (etwa ein volles Gespräch mit dem Assistenten): nicht wählbar. */
export interface ChatRecipientOption<R extends string> {
  value: R;
  label: string;
  disabled?: boolean;
}

interface ChatInputProps<R extends string> {
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
  /**
   * Hinweis unter dem Feld, solange kein Fehler dort steht, z. B. dass eigene Worte an den
   * Reparatur-Assistenten gehen. Auch für den Screenreader am Feld.
   */
  hint?: string;
  /**
   * Wer die Nachricht bekommt. Eine gesperrte Option fällt aus der Wahl. Bleibt nur eine übrig,
   * gibt es nichts zu wählen und die Zeile entfällt. Den Empfänger zum Senden bestimmt der Screen.
   */
  recipient?: {
    accessibilityLabel: string;
    value: R;
    options: readonly ChatRecipientOption<R>[];
    onChange: (value: R) => void;
  };
  /** Zeile über dem Feld, z. B. „Foto angehängt“ */
  above?: React.ReactNode;
  camera?: { label: string; onPress: () => void; disabled?: boolean };
}

export function ChatInput<R extends string = string>({
  label,
  placeholder,
  value,
  onChangeText,
  onSend,
  sendLabel,
  canSend,
  error,
  hint,
  recipient,
  above,
  camera,
}: ChatInputProps<R>) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [focus, setFocus] = useState(false);
  const fontSize = theme.typeRoles.bodyLg.fontSize * (theme.previewFontScale ?? 1);
  const choices = recipient?.options.filter((o) => !o.disabled) ?? [];
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
      {recipient && choices.length > 1 ? (
        <View style={styles.recipient}>
          <SegmentedControl
            accessibilityLabel={recipient.accessibilityLabel}
            options={choices}
            value={recipient.value}
            onChange={recipient.onChange}
          />
        </View>
      ) : null}
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
            accessibilityHint={error ?? hint}
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
      ) : hint ? (
        <Text variant="caption">{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { gap: 6, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  recipient: { alignSelf: 'flex-start' },
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
