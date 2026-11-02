import { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { motion, useTheme } from '@/theme';

import { Rise } from './Rise';
import { Text } from './Text';

interface ToastProps {
  message: string;
  style?: StyleProp<ViewStyle>;
}

/** Kurze Bestätigung. Blendet ruhig ein, der Screenreader sagt sie an. */
export function Toast({ message, style }: ToastProps) {
  const theme = useTheme();
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(message);
  }, [message]);
  return (
    <Rise
      distance={8}
      duration={motion.fade}
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
    </Rise>
  );
}

const styles = StyleSheet.create({
  toast: { paddingHorizontal: 14, paddingVertical: 12 },
});
