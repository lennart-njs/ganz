import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

import { Icon } from './Icon';
import { Text } from './Text';

interface DisclosureProps {
  title: string;
  children: ReactNode;
  initiallyOpen?: boolean;
}

/** Eingeklappter Abschnitt, z. B. „Das geht an Kranich“. */
export function Disclosure({ title, children, initiallyOpen = false }: DisclosureProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <View style={[styles.wrap, { borderColor: theme.colors.borderDefault }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((o) => !o)}
        style={[styles.head, { minHeight: theme.size.controlLg }]}
      >
        <Text variant="labelStrong" style={styles.title}>
          {title}
        </Text>
        <View style={open && styles.rotated}>
          <Icon name="expand" size={20} color="textMuted" />
        </View>
      </Pressable>
      {open ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  title: { flex: 1 },
  rotated: { transform: [{ rotate: '180deg' }] },
  body: { paddingBottom: 14 },
});
