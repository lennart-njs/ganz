// Läuft VoiceOver oder TalkBack? Dann klappt nichts beim Scrollen weg (Entscheidung 38).
// Im Web meldet react-native-web immer „an“, ohne es zu wissen. Dort zählt die Angabe nicht.
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

export function useScreenReader(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let alive = true;
    AccessibilityInfo.isScreenReaderEnabled?.()
      .then((v) => alive && setOn(!!v))
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener?.('screenReaderChanged', (v: boolean) =>
      setOn(!!v),
    );
    return () => {
      alive = false;
      sub?.remove();
    };
  }, []);
  return on;
}
