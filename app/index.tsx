import { StyleSheet, Text, View } from 'react-native';

import { de } from '@/i18n/de';

export default function Index() {
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        {de.app.name}
      </Text>
      <Text>{de.app.setupHint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  title: { fontSize: 28, fontWeight: '600' },
});
