import { Pressable, StyleSheet, View } from 'react-native';

import { PhotoFrame, Text } from '@/components/ds';
import { de } from '@/i18n/de';
import { useTheme } from '@/theme';

interface DeviceCardProps {
  title: string;
  meta: string;
  status: string;
  protectedBy?: boolean;
  onPress?: () => void;
}

/** Gerät mit Foto, Schutz-Hinweis und Status (B-49) */
export function DeviceCard({ title, meta, status, protectedBy, onPress }: DeviceCardProps) {
  const theme = useTheme();
  const content = (
    <>
      <View>
        <PhotoFrame label={title} ratio={4 / 3} />
        {protectedBy ? (
          <View
            style={[
              styles.badge,
              { backgroundColor: theme.colors.surfaceCard, borderRadius: theme.radius.pill },
            ]}
          >
            <Text variant="caption" tone="strong">
              {de.home.protectionActive}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.row}>
        <Text variant="labelStrong" style={styles.title}>
          {title}
        </Text>
        <View style={styles.status}>
          <View style={[styles.dot, { backgroundColor: theme.colors.textStrong }]} />
          <Text variant="meta" tone="body">
            {status}
          </Text>
        </View>
      </View>
      <Text variant="meta">{meta}</Text>
    </>
  );
  if (!onPress) return <View style={styles.card}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[title, status, meta, protectedBy ? de.home.protectionActive : '']
        .filter(Boolean)
        .join(', ')}
      onPress={onPress}
      style={styles.card}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8, minHeight: 44 },
  badge: { position: 'absolute', top: 12, left: 12, paddingHorizontal: 12, paddingVertical: 6 },
  row: { flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' },
  title: { flex: 1 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
});
