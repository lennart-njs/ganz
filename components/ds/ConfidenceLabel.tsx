import { StyleSheet, View } from 'react-native';

import { de } from '@/i18n/de';
import { useTheme } from '@/theme';

import { Text } from './Text';

export type ConfidenceLevel = 'hoch' | 'mittel' | 'unsicher';

const filled: Record<ConfidenceLevel, number> = { hoch: 3, mittel: 2, unsicher: 1 };

/** Sicherheit als Wort und Balken, nie nur als Farbe. */
export function ConfidenceLabel({ level }: { level: ConfidenceLevel }) {
  const theme = useTheme();
  const word = de.ds.confidenceLevel[level];
  return (
    <View style={styles.row} accessible accessibilityLabel={`${de.ds.confidence}: ${word}`}>
      <View style={styles.bars}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[
              styles.bar,
              {
                height: 6 + i * 4,
                backgroundColor:
                  i < filled[level] ? theme.colors.textStrong : theme.colors.borderDefault,
              },
            ]}
          />
        ))}
      </View>
      <Text variant="body" tone="strong">
        {`${de.ds.confidence}: ${word}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  bar: { width: 4, borderRadius: 1 },
});
