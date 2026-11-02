// Plus unten rechts auf der Startseite. Ein Tap öffnet ein kleines Menü über dem Knopf.
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, Text } from '@/components/ds';
import { de } from '@/i18n/de';
import { useTheme } from '@/theme';

export interface AddMenuItem {
  key: string;
  label: string;
  sub?: string;
  onPress: () => void;
}

const FAB = 56;
/** Höhe der Tab-Leiste ohne sicheren Bereich (ungefähr, wie React Navigation) */
const TAB_BAR = 56;

export function AddMenu({ items }: { items: AddMenuItem[] }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const pick = (item: AddMenuItem) => {
    setOpen(false);
    item.onPress();
  };
  const fab = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={open ? de.a11y.close : de.home.addMenu}
      accessibilityState={{ expanded: open }}
      onPress={() => setOpen(!open)}
      style={({ pressed }) => [
        styles.fab,
        {
          backgroundColor: pressed ? theme.colors.actionPrimaryPressed : theme.colors.actionPrimary,
          borderRadius: theme.radius.pill,
          shadowColor: theme.colors.shadow,
        },
      ]}
    >
      <Icon name={open ? 'close' : 'add'} size={26} color="actionOnPrimary" />
    </Pressable>
  );
  return (
    <>
      <View style={styles.anchor} pointerEvents="box-none">
        {fab}
      </View>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.backdrop }]}
          accessibilityRole="button"
          accessibilityLabel={de.a11y.close}
          onPress={() => setOpen(false)}
        />
        {/* Über dem Plus: Tab-Leiste, Abstand und Knopf liegen darunter */}
        <View
          style={[styles.menuWrap, { bottom: insets.bottom + TAB_BAR + 20 + FAB + 12 }]}
          pointerEvents="box-none"
        >
          <View
            accessibilityRole="menu"
            style={[
              styles.menu,
              {
                backgroundColor: theme.colors.surfaceInverse,
                borderRadius: theme.radius.group + 8,
              },
            ]}
          >
            {items.map((item) => (
              <Pressable
                key={item.key}
                accessibilityRole="menuitem"
                accessibilityLabel={item.sub ? de.a11y.withSub(item.label, item.sub) : item.label}
                onPress={() => pick(item)}
                style={({ pressed }) => [
                  styles.item,
                  {
                    borderRadius: theme.radius.group,
                    backgroundColor: pressed ? theme.colors.textBody : 'transparent',
                  },
                ]}
              >
                <Text variant="labelStrong" tone="onInverse">
                  {item.label}
                </Text>
                {item.sub ? (
                  <Text variant="meta" tone="onInverseMuted">
                    {item.sub}
                  </Text>
                ) : null}
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  anchor: { position: 'absolute', right: 20, bottom: 20 },
  fab: {
    width: FAB,
    height: FAB,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  menuWrap: { position: 'absolute', right: 20, left: 20, alignItems: 'flex-end', gap: 12 },
  menu: { padding: 6, minWidth: 240, maxWidth: 340, gap: 2 },
  item: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 56,
    justifyContent: 'center',
    gap: 2,
  },
});
