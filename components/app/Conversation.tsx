// Bausteine für Gespräche: mach’s fragt eine Sache nach der anderen, Antworten stehen unten.
// Angelehnt an das Chat-Muster aus dem Designsystem (ChatBubble), mit Antwort-Buttons statt Formular.
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, Text, type IconName } from '@/components/ds';
import { de } from '@/i18n/de';
import { useTheme } from '@/theme';

const t = de.talk;

/**
 * Nachricht von mach’s oder vom Assistenten: Text ohne Blase. Einen Absender zeigt nur der
 * Reparatur-Assistent, mach’s spricht ohne Namen (Entscheidung 20).
 */
export function BotSays({
  lines,
  sender = true,
  name = de.app.name,
  hint,
  children,
}: {
  lines: string[];
  /** Kleiner Hinweis unter der Frage */
  hint?: string;
  /** Absender nur über der ersten Nachricht einer Folge */
  sender?: boolean;
  name?: string;
  children?: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={styles.bot}>
      {sender && name !== de.app.name ? (
        <Text variant="meta" style={{ fontWeight: theme.fontWeight.semibold }}>
          {name}
        </Text>
      ) : null}
      {lines.map((line, i) => (
        <Text key={i} variant="title">
          {line}
        </Text>
      ))}
      {hint ? (
        <Text variant="body" tone="muted">
          {hint}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

/** Runder Knopf mit Symbol, 44 pt, z. B. Stift oder Kamera */
export function IconButton({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={disabled ? { disabled: true } : undefined}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.edit,
        {
          width: theme.size.hitMin,
          height: theme.size.hitMin,
          borderRadius: theme.radius.pill,
          borderColor: theme.colors.borderControl,
          backgroundColor: pressed ? theme.colors.surfaceMuted : theme.colors.surfaceCard,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      <Icon name={icon} size={18} color="textBody" />
    </Pressable>
  );
}

/** Antwort des Haushalts: Tintenblase rechts. Mit Stift lässt sie sich ändern. Optional mit Foto. */
export function UserSaid({
  text,
  onEdit,
  photoUri,
  to,
}: {
  text: string;
  onEdit?: () => void;
  /** Foto zur Nachricht. Leerer String: Beispielfoto ohne Bild. */
  photoUri?: string;
  /** Empfänger, wenn nicht mach’s oder der Assistent, z. B. „An Fründ“ */
  to?: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.userRow}>
      {onEdit ? <IconButton icon="edit" label={t.edit(text)} onPress={onEdit} /> : null}
      <View
        accessible
        accessibilityLabel={de.chat.message(
          to ? de.common.dot(de.chat.you, to) : de.chat.you,
          photoUri === undefined ? text : de.common.dot(de.chat.photoLabel, text),
        )}
        style={[
          styles.bubble,
          {
            // mach’s: keine dunklen Flächen, die eigene Antwort ist blau wie eine Auswahl
            backgroundColor: theme.colors.actionPrimary,
            borderTopLeftRadius: theme.radius.lg,
            borderTopRightRadius: theme.radius.lg,
            borderBottomLeftRadius: theme.radius.lg,
            borderBottomRightRadius: theme.radius.xs,
          },
        ]}
      >
        {to ? (
          <Text variant="meta" tone="onPrimary">
            {to}
          </Text>
        ) : null}
        {photoUri ? (
          <Image
            source={{ uri: photoUri }}
            style={[styles.photo, { borderRadius: theme.radius.media }]}
            resizeMode="cover"
          />
        ) : photoUri === '' ? (
          <Text variant="meta" tone="onPrimary">
            {de.chat.photoDemo}
          </Text>
        ) : null}
        <Text variant="bodyLg" tone="onPrimary">
          {text}
        </Text>
      </View>
    </View>
  );
}

export function Typing({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <View style={styles.typing} accessible accessibilityLiveRegion="polite">
      <ActivityIndicator color={theme.colors.textMuted} />
      <Text variant="meta">{label}</Text>
    </View>
  );
}

export interface Reply {
  key: string;
  label: string;
  sub?: string;
}

/**
 * Antwort-Buttons als Liste am unteren Rand. Lange Listen scrollen in sich,
 * damit das Gespräch darüber sichtbar bleibt.
 */
export function QuickReplies({
  replies,
  onPick,
  label = t.replies,
  footer,
  safeBottom = true,
}: {
  replies: Reply[];
  onPick: (key: string) => void;
  label?: string;
  /** z. B. ein Eingabefeld unter den Antworten */
  footer?: ReactNode;
  safeBottom?: boolean;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  return (
    <View
      style={[
        styles.replies,
        {
          // mach’s: weißer Grund, jede Antwort eine graue Fläche, Abstand statt Linien
          backgroundColor: theme.colors.bgPage,
          paddingBottom: safeBottom && !footer ? Math.max(insets.bottom, 8) : 0,
        },
      ]}
    >
      <ScrollView
        style={{ maxHeight: height * 0.5 }}
        contentContainerStyle={{ paddingHorizontal: theme.gutter, gap: 8, paddingBottom: 8 }}
        bounces={false}
        accessibilityRole="list"
        accessibilityLabel={label}
      >
        {replies.map((r) => (
          <Pressable
            key={r.key}
            // Fester Name für die Maestro-Flows in e2e/, unabhängig vom Text der Antwort
            testID={`antwort-${r.key}`}
            accessibilityRole="button"
            accessibilityLabel={r.sub ? de.a11y.withSub(r.label, r.sub) : r.label}
            onPress={() => onPick(r.key)}
            style={({ pressed }) => [
              styles.reply,
              {
                paddingHorizontal: 16,
                borderRadius: theme.radius.group,
                backgroundColor: pressed ? theme.colors.borderSubtle : theme.colors.surfaceCard,
              },
            ]}
          >
            <View style={styles.replyText}>
              <Text variant="labelStrong">{r.label}</Text>
              {r.sub ? <Text variant="meta">{r.sub}</Text> : null}
            </View>
            <Icon name="forward" size={18} color="actionPrimary" />
          </Pressable>
        ))}
      </ScrollView>
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  bot: { gap: 8, alignItems: 'flex-start', marginTop: 8 },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginVertical: 4,
  },
  edit: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  bubble: { maxWidth: '80%', paddingHorizontal: 16, paddingVertical: 12, flexShrink: 1, gap: 8 },
  photo: { width: 200, height: 150 },
  typing: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  replies: { paddingTop: 8 },
  reply: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingVertical: 10,
  },
  replyText: { flex: 1, gap: 2 },
});
