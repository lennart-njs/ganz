// „Bewegung reduzieren“ des Systems. Mit true laufen Übergänge ohne Animation.
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((v) => alive && setReduce(!!v))
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v: boolean) =>
      setReduce(!!v),
    );
    return () => {
      alive = false;
      sub?.remove();
    };
  }, []);
  return reduce;
}
