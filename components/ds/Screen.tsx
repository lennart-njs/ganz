import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
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
}

/** Gerüst eines Screens: Kopf, scrollender Inhalt mit 20 px Rand, feste Leiste unten. */
export function Screen({ header, footer, children, scroll = true, safeTop = true }: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.root,
        { backgroundColor: theme.colors.bgPage, paddingTop: safeTop ? insets.top : 0 },
      ]}
    >
      {header}
      {scroll ? (
        <ScrollView
          style={styles.root}
          contentContainerStyle={[
            styles.content,
            { paddingHorizontal: theme.gutter, paddingBottom: footer ? 24 : insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={styles.root}>{children}</View>
      )}
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingTop: 8, gap: 16 },
});
