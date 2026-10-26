import { Pressable, StyleSheet } from 'react-native';

import { Icon, type IconName } from '@/components/ds';
import { useTheme } from '@/theme';

interface RoundButtonProps {
  icon: IconName;
  label: string;
  onPress: () => void;
  /** Umschalter: Zustand für den Screenreader (B-24) */
  selected?: boolean;
  danger?: boolean;
}

/** Runder Knopf im Videocall, 56 pt */
export function RoundButton({ icon, label, onPress, selected, danger }: RoundButtonProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole={selected === undefined ? 'button' : 'switch'}
      accessibilityLabel={label}
      accessibilityState={selected === undefined ? undefined : { checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.round,
        danger
          ? { backgroundColor: theme.colors.actionDanger, borderColor: theme.colors.actionDanger }
          : {
              borderColor: theme.colors.onPhoto,
              backgroundColor: selected === false ? theme.colors.onPhoto : 'transparent',
            },
        pressed && styles.pressed,
      ]}
    >
      <Icon
        name={icon}
        size={24}
        color={danger ? 'actionOnDanger' : selected === false ? 'photoInk' : 'onPhoto'}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  round: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.8 },
});
