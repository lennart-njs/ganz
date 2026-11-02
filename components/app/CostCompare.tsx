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

/**
 * Eine Zahl groß, der Vergleich klein darunter (mach’s: „Ein Ding ist groß“, Entscheidung 20).
 * Die Ersparnis ist berechnet und als „dieser Fall“ beschriftet (B-48).
 */
export function CostCompare({ quote, focus = 'repair' }: CostCompareProps) {
  const theme = useTheme();
  const hints = useAppStore((s) => s.demo.hints);
  const repair = focus === 'repair';
  const label = repair ? de.costs.repair : de.costs.replacement;
  const sub = repair ? de.costs.repairSub : de.costs.replacementSub;
  const amount = formatEuro(repair ? quote.repair.total : quote.replacement.total);
  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.box,
          { backgroundColor: theme.colors.surfaceCard, borderRadius: theme.radius.group },
        ]}
        accessible
        accessibilityLabel={de.a11y.fact(label, amount)}
      >
        <Text variant="meta">{de.common.dot(label, sub)}</Text>
        <Text variant="display">{amount}</Text>
      </View>
      {repair ? (
        <Text variant="meta">
          {de.costs.compareNew(formatEuro(quote.replacement.total), formatEuro(quote.saving))}
        </Text>
      ) : null}
      {quote.isExample && hints ? <Text variant="caption">{de.common.exampleValues}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  box: { padding: 16, gap: 2 },
});
