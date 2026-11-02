import { Pressable, StyleSheet, View } from 'react-native';
import type { ReactNode } from 'react';

import { de } from '@/i18n/de';
import { useTheme } from '@/theme';

import { Icon } from './Icon';
import { Text } from './Text';

interface NavRowProps {
  title: string;
  sub?: string;
  onPress: () => void;
  tone?: 'white' | 'muted';
  leading?: ReactNode;
  accessibilityHint?: string;
}

/** Listenzeile mit Chevron. */
export function NavRow({
  title,
  sub,
  onPress,
  tone = 'white',
  leading,
  accessibilityHint,
}: NavRowProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={de.a11y.withSub(title, sub)}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          minHeight: theme.size.controlLg,
          borderRadius: theme.radius.group,
          backgroundColor: pressed ? theme.colors.borderSubtle : theme.colors.surfaceCard,
        },
      ]}
    >
      {leading}
      <View style={styles.text}>
        <Text variant="labelStrong">{title}</Text>
        {sub ? <Text variant="meta">{sub}</Text> : null}
      </View>
      <Icon name="forward" size={18} color="textMuted" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  text: { flex: 1, gap: 2 },
});
