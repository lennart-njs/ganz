// Bausteine für Gespräche: ganz fragt eine Sache nach der anderen, Antworten stehen unten.
// Angelehnt an das Chat-Muster aus dem Designsystem (ChatBubble), mit Antwort-Buttons statt Formular.
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, Text } from '@/components/ds';
import { de } from '@/i18n/de';
import { useTheme } from '@/theme';

const t = de.talk;

/** Nachricht von ganz oder vom Assistenten: großer Text ohne Blase, über der ersten Zeile der Absender */
export function BotSays({
  lines,
  sender = true,
  hint,
  children,
}: {
  lines: string[];
  /** Kleiner Hinweis unter der Frage */
  hint?: string;
  /** Absender nur über der ersten Nachricht einer Folge */
  sender?: boolean;
  children?: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={styles.bot}>
      {sender ? (
        <Text variant="meta" style={{ fontFamily: theme.fontFamily.semibold }}>
          {de.app.name}
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

/** Antwort des Haushalts: Tintenblase rechts. Mit Stift lässt sie sich ändern. */
export function UserSaid({ text, onEdit }: { text: string; onEdit?: () => void }) {
  const theme = useTheme();
  return (
    <View style={styles.userRow}>
      {onEdit ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.edit(text)}
          onPress={onEdit}
          style={({ pressed }) => [
            styles.edit,
            {
              width: theme.size.hitMin,
              height: theme.size.hitMin,
              borderRadius: theme.radius.pill,
              borderColor: theme.colors.borderControl,
              backgroundColor: pressed ? theme.colors.surfaceMuted : theme.colors.surfaceCard,
            },
          ]}
        >
          <Icon name="edit" size={18} color="textBody" />
        </Pressable>
      ) : null}
      <View
        accessible
        accessibilityLabel={de.chat.message(de.chat.you, text)}
        style={[
          styles.bubble,
          {
            backgroundColor: theme.colors.surfaceInverse,
            borderTopLeftRadius: theme.radius.lg,
            borderTopRightRadius: theme.radius.lg,
            borderBottomLeftRadius: theme.radius.lg,
            borderBottomRightRadius: theme.radius.xs,
          },
        ]}
      >
        <Text variant="bodyLg" tone="onInverse">
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
          backgroundColor: theme.colors.surfaceMuted,
          borderTopColor: theme.colors.borderDefault,
          paddingBottom: safeBottom && !footer ? Math.max(insets.bottom, 8) : 0,
        },
      ]}
    >
      <ScrollView
        style={{ maxHeight: height * 0.5 }}
        bounces={false}
        accessibilityRole="list"
        accessibilityLabel={label}
      >
        {replies.map((r, i) => (
          <Pressable
            key={r.key}
            accessibilityRole="button"
            accessibilityLabel={r.sub ? de.a11y.withSub(r.label, r.sub) : r.label}
            onPress={() => onPick(r.key)}
            style={({ pressed }) => [
              styles.reply,
              {
                paddingHorizontal: theme.gutter,
                borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth,
                borderTopColor: theme.colors.borderDefault,
                backgroundColor: pressed ? theme.colors.surfaceCard : 'transparent',
              },
            ]}
          >
            <View style={styles.replyText}>
              <Text variant="labelStrong">{r.label}</Text>
              {r.sub ? <Text variant="meta">{r.sub}</Text> : null}
            </View>
            <Icon name="forward" size={18} color="textMuted" />
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
  bubble: { maxWidth: '80%', paddingHorizontal: 16, paddingVertical: 12, flexShrink: 1 },
  typing: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  replies: { borderTopWidth: StyleSheet.hairlineWidth },
  reply: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 60,
    paddingVertical: 12,
  },
  replyText: { flex: 1, gap: 2 },
});
