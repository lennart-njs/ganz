import { Pressable, StyleSheet, View } from 'react-native';

import { de } from '@/i18n/de';
import { useTheme } from '@/theme';

import { Text } from './Text';

interface StarRatingProps {
  value: number;
  onChange: (value: number) => void;
}

/** Bewertung mit ★, der einzigen Glyphe im Designsystem. */
export function StarRating({ value, onChange }: StarRatingProps) {
  const theme = useTheme();
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={de.a11y.rating}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable
          key={n}
          accessibilityRole="radio"
          accessibilityLabel={de.a11y.starsOf(n)}
          accessibilityState={{ checked: n === value }}
          onPress={() => onChange(n)}
          style={styles.star}
        >
          <Text
            allowFontScaling={false}
            style={{
              fontSize: 32,
              lineHeight: 40,
              color: n <= value ? theme.colors.textStrong : theme.colors.borderControl,
            }}
          >
            {de.symbols.star}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  star: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
});
