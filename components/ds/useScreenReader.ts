// Läuft VoiceOver oder TalkBack? Dann klappt nichts beim Scrollen weg (Entscheidung 38).
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useScreenReader(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
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
