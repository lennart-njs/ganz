import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { de } from '@/i18n/de';
import { useTheme } from '@/theme';

import { animateLayout } from './animateLayout';
import { ExpandToggle } from './ExpandToggle';
import { Text } from './Text';

interface DisclosureProps {
  title: string;
  children: ReactNode;
  initiallyOpen?: boolean;
}

/**
 * Eingeklappter Abschnitt, z. B. „Das geht an Kranich“. Eine Kachel mit grauem Rahmen und Plus
 * wie Section, nur kleiner (Entscheidung 38).
 */
export function Disclosure({ title, children, initiallyOpen = false }: DisclosureProps) {
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
        accessibilityLabel={title}
        accessibilityHint={open ? de.ds.collapse : de.ds.expand}
        accessibilityState={{ expanded: open }}
        onPress={() => {
          animateLayout();
          setOpen((o) => !o);
        }}
        style={({ pressed }) => [
          styles.head,
          {
            minHeight: theme.size.hitMin,
            borderRadius: theme.radius.group,
            backgroundColor: pressed ? theme.colors.surfaceCard : 'transparent',
          },
        ]}
      >
        <Text variant="labelStrong" style={styles.title}>
          {title}
        </Text>
        <ExpandToggle open={open} size={20} />
      </Pressable>
      {open ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { borderWidth: 1, overflow: 'hidden', alignSelf: 'stretch' },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  title: { flex: 1 },
  body: { paddingBottom: 14, paddingHorizontal: 14 },
});
