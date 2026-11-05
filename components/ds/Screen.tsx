import { useCallback, useMemo, useRef, useState, type ReactNode, type Ref } from 'react';
import {
  Platform,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import {
  KeyboardAwareScrollView,
  KeyboardStickyView,
  type KeyboardAwareScrollViewRef,
} from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

import { animateLayout } from './animateLayout';
import { ScrollCollapseContext, nextCollapsed } from './scrollCollapse';
import { useReduceMotion } from './useReduceMotion';
import { useScreenReader } from './useScreenReader';

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

/** Ein Ref, der an mehrere Stellen geht: an den Aufrufer und an den Screen selbst */
function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === 'function') ref(value);
  else if (ref) (ref as { current: T | null }).current = value;
}

/**
 * Gerüst eines Screens: Kopf, scrollender Inhalt mit 20 px Rand, feste Leiste unten.
 * Bei offener Tastatur rückt die Leiste über die Tastatur, und der Inhalt scrollt
 * das aktive Eingabefeld darüber. Beim Hochscrollen klappen Antworten in der Leiste ein, beim
 * Herunterscrollen kommen sie wieder (Entscheidung 38, useScrollCollapse). Mit Screenreader nie.
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
  const reduceMotion = useReduceMotion();
  const screenReader = useScreenReader();
  const own = useRef<KeyboardAwareScrollViewRef | null>(null);
  const setRef = useCallback(
    (value: KeyboardAwareScrollViewRef | null) => {
      own.current = value;
      assignRef(scrollRef, value);
    },
    [scrollRef],
  );
  const lastY = useRef(0);
  const [collapsedRaw, setCollapsed] = useState(false);
  const collapsed = collapsedRaw && !screenReader;
  const change = useCallback((next: boolean) => {
    setCollapsed((prev) => {
      if (prev !== next) animateLayout();
      return next;
    });
  }, []);
  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      const y = contentOffset.y;
      const dy = y - lastY.current;
      lastY.current = y;
      change(
        nextCollapsed(collapsedRaw, {
          dy,
          fromEnd: contentSize.height - layoutMeasurement.height - y,
          canScroll: contentSize.height > layoutMeasurement.height,
        }),
      );
    },
    [change, collapsedRaw],
  );
  const collapse = useMemo(
    () => ({
      collapsed,
      expand: () => {
        change(false);
        own.current?.scrollToEnd({ animated: !reduceMotion });
      },
    }),
    [collapsed, change, reduceMotion],
  );
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
          ref={setRef}
          onScroll={footer ? onScroll : undefined}
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
          <ScrollCollapseContext.Provider value={collapse}>{footer}</ScrollCollapseContext.Provider>
        </KeyboardStickyView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingTop: 8, gap: 16 },
});
