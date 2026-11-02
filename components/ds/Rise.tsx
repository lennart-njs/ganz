// Blendet Inhalt ein und lässt ihn dabei ein Stück aufsteigen (Sheet, Menü, Hinweis).
// Bei „Bewegung reduzieren“ steht er sofort da.
import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';

import { motion } from '@/theme';

import { useReduceMotion } from './useReduceMotion';

interface RiseProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Weg nach oben in pt. 0: nur einblenden. */
  distance?: number;
  duration?: number;
}

export function Rise({
  children,
  style,
  distance = motion.riseDistance,
  duration = motion.rise,
  ...rest
}: RiseProps & Omit<React.ComponentProps<typeof Animated.View>, 'style'>) {
  const reduce = useReduceMotion();
  const t = useState(() => new Animated.Value(reduce ? 1 : 0))[0];
  useEffect(() => {
    if (reduce) {
      t.setValue(1);
      return;
    }
    Animated.timing(t, {
      toValue: 1,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [t, reduce, duration]);
  return (
    <Animated.View
      {...rest}
      style={[
        style,
        {
          opacity: t,
          transform: [
            { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
