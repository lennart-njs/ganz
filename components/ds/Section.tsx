import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { de } from '@/i18n/de';
import { useTheme } from '@/theme';

import { animateLayout } from './animateLayout';
import { ExpandToggle } from './ExpandToggle';
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
 * Abschnitt einer Übersichtsseite (Gerät, Profil, Fälle, Fallakte). Eine Kachel mit grauem Rahmen
 * (Entscheidung 38). Eingeklappt sieht man Titel, eine Zeile Zusammenfassung und ein Plus, ein Tap
 * auf die Kopfzeile öffnet den Inhalt in derselben Kachel.
 */
export function Section({ title, summary, initiallyOpen = false, children }: SectionProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <View
      style={[
        styles.tile,
        { borderColor: theme.colors.borderDefault, borderRadius: theme.radius.group },
      ]}
    >
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
        <ExpandToggle open={open} />
      </Pressable>
      {open ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { borderWidth: 1, overflow: 'hidden' },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  text: { flex: 1, gap: 2 },
  body: { gap: 12, paddingTop: 4, paddingBottom: 16, paddingHorizontal: 16 },
});
