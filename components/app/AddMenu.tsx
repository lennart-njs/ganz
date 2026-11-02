// Plus unten rechts auf der Startseite. Ein Tap öffnet ein kleines Menü über dem Knopf.
// Offen liegt an derselben Stelle ein X über der Abdunklung, das Menü steigt darüber auf.
import { useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { Icon, Rise, Text, useReduceMotion } from '@/components/ds';
import { de } from '@/i18n/de';
import { useTheme } from '@/theme';

export interface AddMenuItem {
  key: string;
  label: string;
  sub?: string;
  onPress: () => void;
}

const FAB = 56;

export function AddMenu({ items }: { items: AddMenuItem[] }) {
  const theme = useTheme();
  const reduce = useReduceMotion();
  const { width, height } = useWindowDimensions();
  const anchor = useRef<React.ComponentRef<typeof View>>(null);
  const [at, setAt] = useState<{ right: number; bottom: number }>();

  const open = () => {
    // Position des Plus auf dem Bildschirm, damit das X im Menü genau dort liegt
    // Erst eine sichere Lage über der Tab-Leiste, dann die gemessene Lage des Plus
    setAt({ right: 20, bottom: 96 });
    anchor.current?.measureInWindow?.((x, y, w, h) =>
      setAt({ right: Math.max(0, width - x - w), bottom: Math.max(0, height - y - h) }),
    );
  };
  const close = () => setAt(undefined);
  const pick = (item: AddMenuItem) => {
    close();
    item.onPress();
  };

  const fab = (isOpen: boolean) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isOpen ? de.a11y.close : de.home.addMenu}
      accessibilityState={{ expanded: isOpen }}
      onPress={isOpen ? close : open}
      style={({ pressed }) => [
        styles.fab,
        {
          backgroundColor: pressed ? theme.colors.actionPrimaryPressed : theme.colors.actionPrimary,
          borderRadius: theme.radius.pill,
          shadowColor: theme.colors.shadow,
        },
      ]}
    >
      <Icon name={isOpen ? 'close' : 'add'} size={26} color="actionOnPrimary" />
    </Pressable>
  );

  return (
    <>
      <View ref={anchor} style={styles.anchor} collapsable={false}>
        {fab(false)}
      </View>
      <Modal
        visible={!!at}
        transparent
        animationType={reduce ? 'none' : 'fade'}
        onRequestClose={close}
        statusBarTranslucent
      >
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.backdrop }]}
          accessibilityRole="button"
          accessibilityLabel={de.a11y.close}
          onPress={close}
        />
        {at ? (
          <View
            style={[styles.stack, { right: at.right, bottom: at.bottom }]}
            pointerEvents="box-none"
          >
            <Rise
              distance={12}
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
            </Rise>
            {fab(true)}
          </View>
        ) : null}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  anchor: { position: 'absolute', right: 20, bottom: 20 },
  stack: { position: 'absolute', alignItems: 'flex-end', gap: 12, left: 20 },
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
  menu: { padding: 6, minWidth: 240, maxWidth: 340, gap: 2 },
  item: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 56,
    justifyContent: 'center',
    gap: 2,
  },
});
