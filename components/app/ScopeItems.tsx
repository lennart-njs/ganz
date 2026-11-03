import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ds';
import { de } from '@/i18n/de';
import { scopeLabels } from '@/lib/consent';
import type { ConsentPurpose } from '@/model/types';

/** Was eine Weitergabe umfasst, als Liste. Dieselben Kategorien speichert die Bestätigung (R-14). */
export function ScopeItems({ purpose }: { purpose: ConsentPurpose }) {
  return (
    <View style={styles.items}>
      {scopeLabels(purpose).map((label) => (
        <Text key={label} variant="body">
          {de.help.item(label)}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  items: { marginTop: 8, gap: 2 },
});
