import {
  Image,
  StyleSheet,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
} from 'react-native';

import { de } from '@/i18n/de';
import { useTheme } from '@/theme';

import { Text } from './Text';

interface PhotoFrameProps {
  /** Was das Foto zeigt. Dient als Label und als Text im Platzhalter. */
  label: string;
  source?: ImageSourcePropType;
  /** Breite durch Höhe, Standard 16 : 10 */
  ratio?: number;
  /** Kleine Vorschaubilder zeigen im Platzhalter keinen Text */
  compact?: boolean;
  /** Platzhalter zeigen, wenn es kein Foto gibt (nur Galerie) */
  placeholder?: boolean;
}

/** Unter dieser Höhe (iPhone SE, mini) werden große Fotos flacher, damit der Text sichtbar bleibt */
const shortScreen = 760;

/**
 * Foto mit 12 px Radius. Ohne Foto zeigt die App nichts (Entscheidung 20): keine Platzhalter.
 * `placeholder` erzwingt den beschrifteten Platzhalter, nur für die Galerie.
 */
export function PhotoFrame({
  label,
  source,
  ratio = 16 / 10,
  compact,
  placeholder,
}: PhotoFrameProps) {
  const theme = useTheme();
  const { height } = useWindowDimensions();
  if (!source && !placeholder) return null;
  const aspectRatio = !compact && height < shortScreen ? Math.max(ratio, 2) : ratio;
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={de.a11y.photo(label)}
      style={[
        styles.frame,
        {
          aspectRatio,
          borderRadius: theme.radius.media,
          backgroundColor: theme.colors.surfaceMuted,
        },
      ]}
    >
      {source ? (
        <Image source={source} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : compact ? null : (
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
