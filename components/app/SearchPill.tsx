import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, Text } from '@/components/ds';
import { de } from '@/i18n/de';
import { useTheme } from '@/theme';

/** Einstieg „Was ist kaputt?“ auf der Startseite */
export function SearchPill({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={de.a11y.withSub(de.home.searchTitle, de.home.searchSub)}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        {
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.surfaceCard,
          borderColor: pressed ? theme.colors.textStrong : theme.colors.borderDefault,
        },
      ]}
    >
      <Icon name="search" size={20} />
      <View style={styles.text}>
        <Text variant="labelStrong">{de.home.searchTitle}</Text>
        <Text variant="caption">{de.home.searchSub}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderWidth: 1,
  },
  text: { flex: 1 },
});
