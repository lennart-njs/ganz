import { StyleSheet, View } from 'react-native';

import { de } from '@/i18n/de';
import { useTheme } from '@/theme';

import { Text } from './Text';
import { useLargeText } from './useLargeText';

export type Fact = readonly [label: string, value: string];

interface FactListProps {
  items: readonly Fact[];
  dense?: boolean;
  ruled?: boolean;
  /** Anteil der Label-Spalte, Standard 38 % */
  labelShare?: number;
}

/** Zwei Spalten: Label grau, Wert stark. Bei großer Schrift untereinander. */
export function FactList({ items, dense, ruled, labelShare = 0.38 }: FactListProps) {
  const theme = useTheme();
  const stacked = useLargeText();
  return (
    <View style={!ruled && { gap: 8 }}>
      {items.map(([label, value], i) => (
        <View
          key={`${label}-${i}`}
          accessible
          accessibilityLabel={de.a11y.fact(label, value)}
          style={[
            stacked ? styles.stacked : styles.row,
            ruled && {
              paddingVertical: 10,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderBottomWidth: i === items.length - 1 ? StyleSheet.hairlineWidth : 0,
              borderColor: theme.colors.borderSubtle,
            },
          ]}
        >
          <Text
            variant={dense ? 'meta' : 'body'}
            tone="muted"
            style={!stacked && { flexBasis: `${labelShare * 100}%`, flexShrink: 0 }}
          >
            {label}
          </Text>
          <Text variant={dense ? 'meta' : 'body'} tone="strong" style={styles.value}>
            {value}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  stacked: { gap: 2 },
  value: { flex: 1 },
});
