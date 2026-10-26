import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

import { Text } from './Text';
import { useLargeText } from './useLargeText';

/** Ab dieser Breite passen Info und eine Aktion nebeneinander (große iPhones, Tablets) */
const rowMinWidth = 428;

/** Aktionen als flache Liste, auch wenn sie in einem Fragment stecken */
function flatten(children: ReactNode): ReactNode[] {
  return Children.toArray(children).flatMap((child) =>
    isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment
      ? flatten(child.props.children)
      : [child],
  );
}

interface ActionBarProps {
  /** Info, z. B. „Schritt 2 von 7“ */
  meta?: string;
  sub?: string;
  /** Aktion(en) */
  children: ReactNode;
}

/**
 * Feste Leiste unten. Auf breiten Screens: links Info, rechts eine Aktion.
 * Sonst steht die Info als Zeile über den Aktionen, und mehrere Aktionen teilen sich die Breite.
 * Ab 150 % Schrift stehen alle Aktionen untereinander.
 */
export function ActionBar({ meta, sub, children }: ActionBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const large = useLargeText();
  const actions = flatten(children);
  const row = !!meta && !large && actions.length === 1 && width >= rowMinWidth;
  const splitActions = !large && actions.length > 1 && !!meta;
  return (
    <View
      style={[
        styles.bar,
        row ? styles.row : styles.stacked,
        {
          paddingBottom: Math.max(insets.bottom, 12) + 8,
          paddingHorizontal: theme.gutter,
          borderTopColor: theme.colors.borderSubtle,
          backgroundColor: theme.colors.bgPage,
        },
      ]}
    >
      {meta ? (
        <View style={row ? styles.info : styles.infoLine} accessible>
          <Text variant="labelStrong">{meta}</Text>
          {sub ? <Text variant="meta">{sub}</Text> : null}
        </View>
      ) : null}
      <View
        style={row ? styles.actionsRow : splitActions ? styles.actionsSplit : styles.actionsStacked}
      >
        {splitActions
          ? actions.map((action, i) => (
              <View key={i} style={styles.split}>
                {action}
              </View>
            ))
          : actions}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center' },
  stacked: { flexDirection: 'column', alignItems: 'stretch' },
  info: { flex: 1 },
  infoLine: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 8 },
  actionsRow: { flexDirection: 'row', gap: 8, flexShrink: 0 },
  actionsSplit: { flexDirection: 'row', gap: 8 },
  split: { flex: 1 },
  actionsStacked: { gap: 8 },
});
