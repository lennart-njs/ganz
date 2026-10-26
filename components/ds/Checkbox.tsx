import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

import { Icon } from './Icon';
import { Text } from './Text';

interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  sub?: string;
}

export function Checkbox({ label, checked, onChange, sub }: CheckboxProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityHint={sub}
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      style={[
        styles.row,
        {
          minHeight: theme.size.controlLg,
          borderColor: theme.colors.borderDefault,
          borderRadius: theme.radius.sm,
          backgroundColor: theme.colors.surfaceCard,
        },
      ]}
    >
      <View
        style={[
          styles.box,
          {
            borderRadius: theme.radius.check,
            borderColor: theme.colors.textStrong,
            backgroundColor: checked ? theme.colors.actionPrimary : theme.colors.surfaceCard,
          },
        ]}
      >
        {checked ? <Icon name="check" size={14} color="actionOnPrimary" strokeWidth={3} /> : null}
      </View>
      <View style={styles.text}>
        <Text variant="body" tone="strong">
          {label}
        </Text>
        {sub ? <Text variant="meta">{sub}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },
  box: {
    width: 22,
    height: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 2 },
});
