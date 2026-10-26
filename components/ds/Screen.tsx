import { useState, type ReactNode, type Ref } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import {
  KeyboardAwareScrollView,
  KeyboardStickyView,
  type KeyboardAwareScrollViewRef,
} from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

interface ScreenProps {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  /** false für Screens, die selbst scrollen oder vollflächig sind */
  scroll?: boolean;
  /** Oberen Safe-Area-Abstand setzen (aus, wenn der Navigator ihn schon setzt) */
  safeTop?: boolean;
  /** Zugriff auf den scrollenden Inhalt, z. B. ans Ende scrollen im Chat */
  scrollRef?: Ref<KeyboardAwareScrollViewRef>;
}

/** Abstand zwischen Eingabefeld und Leiste, wenn die Tastatur offen ist */
const fieldGap = 16;

/**
 * Gerüst eines Screens: Kopf, scrollender Inhalt mit 20 px Rand, feste Leiste unten.
 * Bei offener Tastatur rückt die Leiste über die Tastatur, und der Inhalt scrollt
 * das aktive Eingabefeld darüber.
 */
export function Screen({
  header,
  footer,
  children,
  scroll = true,
  safeTop = true,
  scrollRef,
}: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [footerHeight, setFooterHeight] = useState(0);
  // Die Leiste hat unten schon den Home-Indicator-Abstand. Über der Tastatur fällt er weg.
  const footerInset = Math.max(insets.bottom, 12);
  return (
    <View
      style={[
        styles.root,
        { backgroundColor: theme.colors.bgPage, paddingTop: safeTop ? insets.top : 0 },
      ]}
    >
      {header}
      {scroll ? (
        <KeyboardAwareScrollView
          ref={scrollRef}
          style={styles.root}
          contentContainerStyle={[
            styles.content,
            { paddingHorizontal: theme.gutter, paddingBottom: footer ? 24 : insets.bottom + 24 },
          ]}
          bottomOffset={(footer ? footerHeight - footerInset : 0) + fieldGap}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        >
          {children}
        </KeyboardAwareScrollView>
      ) : (
        <View style={styles.root}>{children}</View>
      )}
      {footer ? (
        <KeyboardStickyView
          offset={{ opened: footerInset }}
          onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}
        >
          {footer}
        </KeyboardStickyView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingTop: 8, gap: 16 },
});
