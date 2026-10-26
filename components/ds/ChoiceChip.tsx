import { Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './Text';

interface ChoiceChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  sub?: string;
  /** 'radio' für Einfachauswahl (Standard), 'checkbox' für Mehrfachauswahl */
  mode?: 'radio' | 'checkbox';
}

export function ChoiceChip({ label, selected, onPress, sub, mode = 'radio' }: ChoiceChipProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole={mode}
      accessibilityLabel={sub ? `${label}, ${sub}` : label}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[
        styles.chip,
        {
          minHeight: sub ? 56 : theme.size.hitMin,
          borderRadius: theme.radius.sm,
          borderColor: selected ? theme.colors.actionPrimary : theme.colors.borderControl,
          backgroundColor: selected ? theme.colors.actionPrimary : theme.colors.surfaceCard,
        },
      ]}
    >
      <Text variant="label" tone={selected ? 'onPrimary' : 'strong'} align="center">
        {label}
      </Text>
      {sub ? (
        <Text variant="meta" tone={selected ? 'onPrimary' : 'body'} align="center">
          {sub}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
