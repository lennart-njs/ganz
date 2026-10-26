import { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './Text';

interface ToastProps {
  message: string;
  style?: StyleProp<ViewStyle>;
}

/** Kurze Bestätigung. Der Screenreader sagt sie an. */
export function Toast({ message, style }: ToastProps) {
  const theme = useTheme();
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(message);
  }, [message]);
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[
        styles.toast,
        { backgroundColor: theme.colors.surfaceInverse, borderRadius: theme.radius.md },
        style,
      ]}
    >
      <Text variant="body" tone="onInverse" align="center">
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: { paddingHorizontal: 14, paddingVertical: 12 },
});
