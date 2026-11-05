// Schalter einer aufklappbaren Kachel (Entscheidung 38): Plus, solange sie zu ist, Minus, wenn sie
// offen ist. Anders als der Pfeil „>“, der in der App für Weitergehen steht. Der Zustand steht
// auch für Screenreader am Button der Kachel (accessibilityState.expanded).
import { View } from 'react-native';

import { Icon } from './Icon';

export function ExpandToggle({ open, size = 22 }: { open: boolean; size?: number }) {
  return (
    // Fester Name für Tests und Maestro, unabhängig vom Symbol
    <View testID={open ? 'kachel-offen' : 'kachel-zu'}>
      <Icon name={open ? 'shut' : 'open'} size={size} color="textStrong" />
    </View>
  );
}
