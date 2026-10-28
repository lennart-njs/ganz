// Bausteine für Gespräche: ganz fragt eine Sache nach der anderen, Antworten stehen unten.
// Angelehnt an das Chat-Muster aus dem Designsystem (ChatBubble), mit Antwort-Buttons statt Formular.
//
// Typo im Gespräch: 17 pt für alles, was gesagt wird (ganz und Haushalt) und für Antworten,
// 15 pt für Erklärungen, 13 pt für den Absender. Kleiner nur das Kleingedruckte.
import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, Text } from '@/components/ds';
import { de } from '@/i18n/de';
import { maxFontScale, motion, useTheme } from '@/theme';

const t = de.talk;

/** Bewegung reduzieren, wenn das System es verlangt */
function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((v) => alive && setReduce(v))
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReduce);
    return () => {
      alive = false;
      sub?.remove();
    };
  }, []);
  return reduce;
}

/** Nachricht von ganz oder vom Assistenten: Text ohne Blase, über der ersten Nachricht der Absender */
export function BotSays({
  lines,
  sender = true,
  name = de.app.name,
  hint,
  children,
}: {
  lines: string[];
  /** Erklärung unter der Nachricht */
  hint?: string;
  /** Absender nur über der ersten Nachricht einer Folge. Im Verlauf setzt `Thread` das selbst. */
  sender?: boolean;
  name?: string;
  children?: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={styles.bot}>
      {sender ? (
        <Text variant="caption" style={{ fontFamily: theme.fontFamily.semibold }}>
          {name}
        </Text>
      ) : null}
      {lines.map((line, i) => (
        <Text key={i} variant="say">
          {line}
        </Text>
      ))}
      {hint ? <Text variant="hint">{hint}</Text> : null}
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
          hitSlop={4}
          style={({ pressed }) => [
            styles.edit,
            {
              borderRadius: theme.radius.pill,
              borderColor: theme.colors.borderDefault,
              backgroundColor: pressed ? theme.colors.surfaceMuted : theme.colors.surfaceCard,
            },
          ]}
        >
          <Icon name="edit" size={15} color="textBody" />
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
        <Text variant="bubble" tone="onInverse">
          {text}
        </Text>
      </View>
    </View>
  );
}

/** Drei Punkte, solange der Assistent schreibt */
export function Typing({ label }: { label: string }) {
  const theme = useTheme();
  const reduce = useReduceMotion();
  const [dots] = useState(() => [0, 1, 2].map(() => new Animated.Value(0.3)));
  useEffect(() => {
    if (reduce) return;
    const pulse = (v: Animated.Value) =>
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(v, { toValue: 0.3, duration: 300, useNativeDriver: true }),
      ]);
    const loop = Animated.loop(Animated.stagger(150, dots.map(pulse)));
    loop.start();
    return () => loop.stop();
  }, [dots, reduce]);
  return (
    <View
      style={styles.typing}
      accessible
      accessibilityLabel={label}
      accessibilityLiveRegion="polite"
    >
      {dots.map((v, i) => (
        <Animated.View
          key={i}
          style={[
            styles.dot,
            { backgroundColor: theme.colors.textMuted, opacity: reduce ? 0.6 : v },
          ]}
        />
      ))}
    </View>
  );
}

/** Wer spricht: für Absender und Abstände im Verlauf */
function speaker(el: ReactElement): string | undefined {
  if (el.type === UserSaid) return 'du';
  if (el.type === BotSays) return (el.props as { name?: string }).name ?? de.app.name;
  if (el.type === Typing) return de.chat.title;
  return undefined;
}

/** Neue Nachrichten blenden kurz ein. Beim Öffnen steht der Verlauf sofort da. */
function Appear({
  animate,
  gap,
  children,
}: {
  animate: boolean;
  gap: number;
  children: ReactNode;
}) {
  const reduce = useReduceMotion();
  const [v] = useState(() => new Animated.Value(animate ? 0 : 1));
  useEffect(() => {
    if (!animate) return;
    Animated.timing(v, {
      toValue: 1,
      duration: reduce ? 0 : motion.message,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    // Nur beim Erscheinen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Animated.View
      style={{
        marginTop: gap,
        opacity: v,
        transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}

/**
 * Der Verlauf: setzt den Absender nur über die erste Nachricht einer Folge, hält Nachrichten
 * desselben Absenders dicht beieinander und lässt zwischen den Sprechern Luft.
 */
export function Thread({ children }: { children: ReactNode }) {
  const list = Children.toArray(children).filter(isValidElement);
  // Was beim Öffnen schon da ist, blendet nicht ein
  const [initial] = useState(() => new Set(list.map((el) => el.key)));
  const speakers = list.map(speaker);
  return (
    <View>
      {list.map((el, i) => {
        const who = speakers[i];
        const same = who !== undefined && who === speakers[i - 1];
        const node =
          el.type === BotSays && same && (el.props as { sender?: boolean }).sender === undefined
            ? cloneElement(el as ReactElement<{ sender?: boolean }>, { sender: false })
            : el;
        const gap = i === 0 ? 0 : same ? (who === 'du' ? 6 : 12) : 24;
        return (
          <Appear key={el.key} animate={!initial.has(el.key)} gap={gap}>
            {node}
          </Appear>
        );
      })}
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
    <View>
      {replies.length ? (
        <View
          style={{
            backgroundColor: theme.colors.surfaceMuted,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: theme.colors.borderDefault,
            paddingBottom: safeBottom && !footer ? Math.max(insets.bottom, 8) : 0,
          }}
        >
          <ScrollView
            style={{ maxHeight: height * 0.45 }}
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
                    backgroundColor: pressed ? theme.colors.borderSubtle : 'transparent',
                  },
                ]}
              >
                <Text variant="say">{r.label}</Text>
                {r.sub ? <Text variant="meta">{r.sub}</Text> : null}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
      {footer}
    </View>
  );
}

/**
 * Eingabefeld im Gespräch: Pille mit kleinem Senden-Pfeil darin. Wächst bis fünf Zeilen.
 * Der Pfeil ist 34 pt groß, die Trefferfläche 44 pt.
 */
export function ChatInput({
  value,
  onChangeText,
  onSend,
  placeholder,
  label,
  error,
  disabled,
}: {
  value: string;
  onChangeText: (v: string) => void;
  onSend: () => void;
  placeholder: string;
  label: string;
  error?: string;
  /** Senden gesperrt, z. B. während der Assistent schreibt */
  disabled?: boolean;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [focus, setFocus] = useState(false);
  // Im Browser wächst ein Textfeld nicht von selbst mit
  const [contentHeight, setContentHeight] = useState(0);
  const scale = theme.previewFontScale ?? 1;
  const fontSize = theme.typeRoles.bodyLg.fontSize * scale;
  const lineHeight = Math.round(fontSize * 1.35);
  const maxHeight = lineHeight * 5 + 11;
  const canSend = !!value.trim() && !disabled;
  const border = focus || error ? 2 : 1;
  return (
    <View
      style={[
        styles.inputBar,
        {
          paddingHorizontal: theme.gutter - 8,
          paddingBottom: Math.max(insets.bottom, 8) + 4,
          borderTopColor: theme.colors.borderSubtle,
          backgroundColor: theme.colors.bgPage,
        },
      ]}
    >
      {error ? (
        <Text
          variant="meta"
          tone="strong"
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={styles.inputError}
        >
          {error}
        </Text>
      ) : null}
      <View
        style={[
          styles.pill,
          {
            borderWidth: border,
            borderColor: focus || error ? theme.colors.textStrong : theme.colors.borderControl,
            backgroundColor: theme.colors.surfaceCard,
            padding: 5 - (border - 1),
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
          // Im Browser ist ein Textfeld sonst zwei Zeilen hoch
          numberOfLines={Platform.OS === 'web' ? 1 : undefined}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          onContentSizeChange={(e) => setContentHeight(e.nativeEvent.contentSize.height)}
          style={[
            styles.input,
            {
              fontFamily: theme.fontFamily.regular,
              fontSize,
              lineHeight,
              maxHeight,
              color: theme.colors.textStrong,
            },
            // Den Fokus zeigt der Rahmen der Pille
            Platform.OS === 'web'
              ? ({
                  outlineStyle: 'none',
                  height: Math.min(Math.max(contentHeight, lineHeight + 11), maxHeight),
                } as object)
              : null,
          ]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={de.chat.send}
          accessibilityState={{ disabled: !canSend }}
          disabled={!canSend}
          onPress={onSend}
          hitSlop={5}
          style={({ pressed }) => [
            styles.send,
            {
              borderRadius: theme.radius.pill,
              backgroundColor: pressed
                ? theme.colors.actionPrimaryPressed
                : theme.colors.actionPrimary,
              opacity: canSend ? 1 : 0.4,
            },
          ]}
        >
          <Icon name="send" size={18} strokeWidth={2.4} color="actionOnPrimary" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bot: { gap: 6, alignItems: 'flex-start' },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
  edit: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  bubble: { maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 10, flexShrink: 1 },
  typing: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 24 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  reply: { justifyContent: 'center', gap: 2, minHeight: 56, paddingVertical: 14 },
  inputBar: { paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth },
  inputError: { paddingHorizontal: 12, paddingBottom: 6 },
  pill: { flexDirection: 'row', alignItems: 'flex-end', borderRadius: 22, minHeight: 44 },
  input: { flex: 1, paddingHorizontal: 10, paddingTop: 6, paddingBottom: 5 },
  send: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
});
