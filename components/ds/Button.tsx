import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme, type ThemeColors } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Text, type TextTone } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'inverse' | 'link' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  disabled?: boolean;
  /** Bei deaktiviertem Button: Erklärung per Toast statt Stille (Designsystem) */
  onDisabledPress?: () => void;
  icon?: IconName;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const heights: Record<ButtonSize, number> = { sm: 44, md: 50, lg: 52 };

interface VariantStyle {
  bg?: keyof ThemeColors;
  bgPressed?: keyof ThemeColors;
  border?: keyof ThemeColors;
  borderPressed?: keyof ThemeColors;
  text: TextTone;
  icon: keyof ThemeColors;
}

const variants: Record<ButtonVariant, VariantStyle> = {
  primary: {
    bg: 'actionPrimary',
    bgPressed: 'actionPrimaryPressed',
    text: 'onPrimary',
    icon: 'actionOnPrimary',
  },
  secondary: {
    bg: 'surfaceCard',
    border: 'borderControl',
    borderPressed: 'textStrong',
    text: 'strong',
    icon: 'textStrong',
  },
  inverse: { bg: 'textOnInverse', text: 'inverted', icon: 'surfaceInverse' },
  link: { text: 'strong', icon: 'textStrong' },
  danger: { bg: 'actionDanger', text: 'onDanger', icon: 'actionOnDanger' },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  fullWidth,
  disabled,
  onDisabledPress,
  icon,
  accessibilityHint,
  style,
  testID,
}: ButtonProps) {
  const theme = useTheme();
  const v = variants[variant];
  const isLink = variant === 'link';
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      onPress={disabled ? onDisabledPress : onPress}
      hitSlop={isLink ? 8 : undefined}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: isLink ? theme.size.hitMin : heights[size],
          paddingHorizontal: isLink ? 0 : size === 'lg' ? 24 : size === 'sm' ? 16 : 20,
          borderRadius: theme.radius.sm,
          opacity: disabled ? 0.4 : 1,
          alignSelf: fullWidth ? 'stretch' : isLink ? 'flex-start' : undefined,
        },
        v.bg && {
          backgroundColor: theme.colors[pressed && v.bgPressed ? v.bgPressed : v.bg],
        },
        v.border && {
          borderWidth: 1,
          borderColor: theme.colors[pressed && v.borderPressed ? v.borderPressed : v.border],
        },
        style,
      ]}
    >
      <View style={styles.content}>
        {icon ? <Icon name={icon} color={v.icon} size={18} /> : null}
        <Text
          variant="label"
          tone={v.text}
          align="center"
          style={[
            size === 'lg' && {
              fontSize: theme.typeRoles.bodyLg.fontSize * (theme.previewFontScale ?? 1),
            },
            isLink && styles.underline,
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { justifyContent: 'center', paddingVertical: 8 },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  underline: { textDecorationLine: 'underline' },
});
