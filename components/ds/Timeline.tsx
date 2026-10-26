import { StyleSheet, View } from 'react-native';

import { de } from '@/i18n/de';
import { useTheme } from '@/theme';

import { Text } from './Text';

export interface TimelineItem {
  when: string;
  what: string;
  /** Offener Punkt: hohler Kreis */
  pending?: boolean;
}

export function Timeline({ items }: { items: readonly TimelineItem[] }) {
  const theme = useTheme();
  return (
    <View>
      {items.map((it, i) => {
        const last = i === items.length - 1;
        return (
          <View
            key={`${it.when}-${i}`}
            style={styles.row}
            accessible
            accessibilityLabel={[it.when, it.what, it.pending ? de.a11y.timelinePending : '']
              .filter(Boolean)
              .join(', ')}
          >
            <View style={styles.rail}>
              <View
                style={[
                  styles.dot,
                  {
                    borderColor: theme.colors.textStrong,
                    backgroundColor: it.pending
                      ? theme.colors.surfaceCard
                      : theme.colors.textStrong,
                  },
                ]}
              />
              {!last ? (
                <View style={[styles.line, { backgroundColor: theme.colors.borderDefault }]} />
              ) : null}
            </View>
            <View style={[styles.body, !last && styles.gap]}>
              <Text variant="caption">{it.when}</Text>
              <Text variant="body" tone="strong">
                {it.what}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  rail: { width: 18, alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, marginTop: 6 },
  line: { flex: 1, width: 2, minHeight: 14 },
  body: { flex: 1 },
  gap: { paddingBottom: 14 },
});
