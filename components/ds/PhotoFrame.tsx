import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';

import { de } from '@/i18n/de';
import { useTheme } from '@/theme';

import { Text } from './Text';

interface PhotoFrameProps {
  /** Was das Foto zeigt. Dient als Label und als Text im Platzhalter. */
  label: string;
  source?: ImageSourcePropType;
  /** Breite durch Höhe, Standard 16 : 10 */
  ratio?: number;
}

/** Foto mit 12 px Radius. Ohne Foto: beschrifteter Platzhalter. */
export function PhotoFrame({ label, source, ratio = 16 / 10 }: PhotoFrameProps) {
  const theme = useTheme();
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={de.a11y.photo(label)}
      style={[
        styles.frame,
        {
          aspectRatio: ratio,
          borderRadius: theme.radius.media,
          backgroundColor: theme.colors.surfaceMuted,
        },
      ]}
    >
      {source ? (
        <Image source={source} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <Text variant="meta" tone="muted" align="center" style={styles.placeholder}>
          {de.ds.photoPlaceholder(label)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center', width: '100%' },
  placeholder: { paddingHorizontal: 16 },
});
