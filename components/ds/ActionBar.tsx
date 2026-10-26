import { StyleSheet, View } from 'react-native';
import type { ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

import { Text } from './Text';
import { useLargeText } from './useLargeText';

interface ActionBarProps {
  /** Info links, z. B. „Schritt 2 von 7“ */
  meta?: string;
  sub?: string;
  /** Aktion(en) rechts oder in voller Breite */
  children: ReactNode;
}

/** Feste Leiste unten: links Info, rechts Aktion. Ohne Info: Aktion in voller Breite. */
export function ActionBar({ meta, sub, children }: ActionBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const stacked = useLargeText() || !meta;
  return (
    <View
      style={[
        styles.bar,
        stacked ? styles.stacked : styles.row,
        {
          paddingBottom: Math.max(insets.bottom, 12) + 8,
          paddingHorizontal: theme.gutter,
          borderTopColor: theme.colors.borderSubtle,
          backgroundColor: theme.colors.bgPage,
        },
      ]}
    >
      {meta ? (
        <View style={!stacked && styles.info} accessible>
          <Text variant="labelStrong">{meta}</Text>
          {sub ? <Text variant="meta">{sub}</Text> : null}
        </View>
      ) : null}
      <View style={stacked ? styles.actionsStacked : styles.actionsRow}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center' },
  stacked: { flexDirection: 'column', alignItems: 'stretch' },
  info: { flex: 1 },
  actionsRow: { flexDirection: 'row', gap: 8, flexShrink: 0 },
  actionsStacked: { gap: 8 },
});
