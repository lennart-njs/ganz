// Pfeil für Auf- und Zuklappen. Dreht sich in 200 ms, bei „Bewegung reduzieren“ sofort.
import { useEffect, useState } from 'react';
import { Animated, Easing } from 'react-native';

import { motion, type ThemeColors } from '@/theme';

import { Icon } from './Icon';
import { useReduceMotion } from './useReduceMotion';

export function ExpandChevron({
  open,
  size = 20,
  color = 'textMuted',
}: {
  open: boolean;
  size?: number;
  color?: keyof ThemeColors;
}) {
  const reduce = useReduceMotion();
  const turn = useState(() => new Animated.Value(open ? 1 : 0))[0];
  useEffect(() => {
    if (reduce) {
      turn.setValue(open ? 1 : 0);
      return;
    }
    Animated.timing(turn, {
      toValue: open ? 1 : 0,
      duration: motion.fade,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [open, reduce, turn]);
  return (
    <Animated.View
      style={{
        transform: [
          { rotate: turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) },
        ],
      }}
    >
      <Icon name="expand" size={size} color={color} />
    </Animated.View>
  );
}
