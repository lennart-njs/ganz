// Nächste Layout-Änderung sanft animieren (Abschnitte auf- und zuklappen).
// Bei „Bewegung reduzieren“ springt das Layout ohne Übergang.
import { AccessibilityInfo, LayoutAnimation } from 'react-native';

import { motion } from '@/theme';

let reduce = false;
AccessibilityInfo.isReduceMotionEnabled?.()
  .then((v) => {
    reduce = !!v;
  })
  .catch(() => undefined);
AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v: boolean) => {
  reduce = !!v;
});

export function animateLayout() {
  if (reduce) return;
  LayoutAnimation.configureNext(
    LayoutAnimation.create(motion.layout, LayoutAnimation.Types.easeInEaseOut, 'opacity'),
  );
}
