import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { de } from '@/i18n/de';
import { useTheme } from '@/theme';

import { animateLayout } from './animateLayout';
import { ExpandChevron } from './ExpandChevron';
import { Text } from './Text';

interface SectionProps {
  title: string;
  /** Eine Zeile, die auch eingeklappt sichtbar ist, z. B. „läuft“ oder „2 Fälle“ */
  summary?: string;
  /** Standard: eingeklappt (Entscheidung 23) */
  initiallyOpen?: boolean;
  children: ReactNode;
}

/**
 * Abschnitt einer Übersichtsseite (Gerät, Profil, Fälle, Fallakte). Eingeklappt sieht man nur
 * Titel und eine Zeile Zusammenfassung, ein Tap öffnet den Inhalt.
 */
export function Section({ title, summary, initiallyOpen = false, children }: SectionProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={summary ? de.a11y.withSub(title, summary) : title}
        accessibilityHint={open ? de.ds.collapse : de.ds.expand}
        accessibilityState={{ expanded: open }}
        onPress={() => {
          animateLayout();
          setOpen((o) => !o);
        }}
        style={({ pressed }) => [
          styles.head,
          {
            minHeight: theme.size.controlLg,
            borderRadius: theme.radius.group,
            backgroundColor: pressed ? theme.colors.surfaceCard : 'transparent',
          },
        ]}
      >
        <View style={styles.text}>
          <Text variant="title" accessibilityRole="header">
            {title}
          </Text>
          {summary && !open ? <Text variant="meta">{summary}</Text> : null}
        </View>
        <ExpandChevron open={open} size={22} />
      </Pressable>
      {open ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {},
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  text: { flex: 1, gap: 2 },
  body: { gap: 12, paddingTop: 4, paddingBottom: 8 },
});
