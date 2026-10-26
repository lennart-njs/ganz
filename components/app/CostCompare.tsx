import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ds';
import { de } from '@/i18n/de';
import { formatEuro } from '@/i18n/format';
import type { Quote } from '@/model/types';
import { useAppStore } from '@/store/appStore';
import { useTheme } from '@/theme';

interface CostCompareProps {
  quote: Quote;
  /** Welche Seite hervorgehoben ist */
  focus?: 'repair' | 'replacement';
}

/** Reparatur gegen Ersatzgerät. Die Ersparnis ist berechnet und als „dieser Fall“ beschriftet (B-48). */
export function CostCompare({ quote, focus = 'repair' }: CostCompareProps) {
  const theme = useTheme();
  const hints = useAppStore((s) => s.demo.hints);
  const box = (on: boolean) => [
    styles.box,
    {
      borderRadius: theme.radius.media,
      backgroundColor: theme.colors.surfaceCard,
      borderColor: on ? theme.colors.textStrong : theme.colors.borderDefault,
      borderWidth: on ? 2 : 1,
    },
  ];
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View
          style={box(focus === 'repair')}
          accessible
          accessibilityLabel={de.a11y.fact(de.costs.repair, formatEuro(quote.repair.total))}
        >
          <Text variant="meta">{de.costs.repair}</Text>
          <Text variant="h1">{formatEuro(quote.repair.total)}</Text>
          <Text variant="caption">{de.costs.repairSub}</Text>
        </View>
        <View
          style={box(focus === 'replacement')}
          accessible
          accessibilityLabel={de.a11y.fact(
            de.costs.replacement,
            formatEuro(quote.replacement.total),
          )}
        >
          <Text variant="meta">{de.costs.replacement}</Text>
          <Text variant="h1" tone={focus === 'replacement' ? 'strong' : 'muted'}>
            {formatEuro(quote.replacement.total)}
          </Text>
          <Text variant="caption">{de.costs.replacementSub}</Text>
        </View>
      </View>
      {focus === 'repair' ? (
        <Text variant="labelStrong">{de.costs.saving(formatEuro(quote.saving))}</Text>
      ) : null}
      {quote.isExample && hints ? <Text variant="caption">{de.common.exampleValues}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  box: { flexGrow: 1, flexBasis: 140, padding: 16, gap: 4 },
});
