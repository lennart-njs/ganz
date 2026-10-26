import { Pressable, StyleSheet, View } from 'react-native';
import type { ReactNode } from 'react';

import { de } from '@/i18n/de';
import { useTheme } from '@/theme';

import { Icon } from './Icon';
import { Text } from './Text';

interface SelectCardProps {
  title: string;
  sub?: string;
  selected: boolean;
  onPress: () => void;
  media?: ReactNode;
}

/** Auswahlkarte mit Radio-Semantik und Häkchen (B-30). */
export function SelectCard({ title, sub, selected, onPress, media }: SelectCardProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={de.a11y.withSub(title, sub)}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[
        styles.card,
        {
          borderRadius: theme.radius.media,
          backgroundColor: theme.colors.surfaceCard,
          borderColor: selected ? theme.colors.textStrong : theme.colors.borderDefault,
          borderWidth: selected ? 2 : 1,
          padding: selected ? 15 : 16,
        },
      ]}
    >
      {media}
      <View style={styles.text}>
        <Text variant="labelStrong">{title}</Text>
        {sub ? <Text variant="meta">{sub}</Text> : null}
      </View>
      <View
        style={[
          styles.check,
          {
            borderColor: selected ? theme.colors.actionPrimary : theme.colors.borderControl,
            backgroundColor: selected ? theme.colors.actionPrimary : 'transparent',
          },
        ]}
      >
        {selected ? <Icon name="check" size={14} color="actionOnPrimary" strokeWidth={3} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 76 },
  text: { flex: 1, gap: 2 },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
