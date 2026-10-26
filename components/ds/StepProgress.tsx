import { StyleSheet, View } from 'react-native';

import { de } from '@/i18n/de';
import { useTheme } from '@/theme';

/** Segmentbalken. current ist 0-basiert. */
export function StepProgress({ total, current }: { total: number; current: number }) {
  const theme = useTheme();
  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={de.a11y.stepOf(current + 1, total)}
      accessibilityValue={{ min: 1, max: total, now: current + 1 }}
    >
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            styles.segment,
            {
              backgroundColor: i <= current ? theme.colors.textStrong : theme.colors.borderDefault,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 4, borderRadius: 2 },
});
