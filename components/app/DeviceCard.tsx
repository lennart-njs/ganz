import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, Text } from '@/components/ds';
import { de } from '@/i18n/de';
import { useTheme } from '@/theme';

interface DeviceCardProps {
  title: string;
  meta: string;
  status: string;
  protectedBy?: boolean;
  onPress?: () => void;
}

/** Gerät als graue Zeile: Name, Status, Gerätetyp und Schutz (B-49). Ohne Foto-Platzhalter. */
export function DeviceCard({ title, meta, status, protectedBy, onPress }: DeviceCardProps) {
  const theme = useTheme();
  const sub = de.common.dot(meta, protectedBy ? de.home.protectionActive : '');
  const content = (
    <>
      <View style={styles.text}>
        <View style={styles.row}>
          <Text variant="labelStrong" style={styles.title}>
            {title}
          </Text>
          <Text variant="meta" tone="body">
            {status}
          </Text>
        </View>
        <Text variant="meta">{sub}</Text>
      </View>
      {onPress ? <Icon name="forward" size={18} color="textMuted" /> : null}
    </>
  );
  const style = [
    styles.card,
    { backgroundColor: theme.colors.surfaceCard, borderRadius: theme.radius.group },
  ];
  if (!onPress) return <View style={style}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[title, status, meta, protectedBy ? de.home.protectionActive : '']
        .filter(Boolean)
        .join(', ')}
      onPress={onPress}
      style={({ pressed }) => [style, pressed && { backgroundColor: theme.colors.borderSubtle }]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, minHeight: 64 },
  text: { flex: 1, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' },
  title: { flex: 1 },
});
