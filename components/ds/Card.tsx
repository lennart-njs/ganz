import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';

import { useTheme } from '@/theme';

import { Text } from './Text';

type CardTone = 'white' | 'muted' | 'inverse';

interface CardProps {
  tone?: CardTone;
  padding?: number;
  media?: ReactNode;
  /** Nur wenn die Karte über einem Foto oder einer Farbfläche schwebt */
  float?: boolean;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Karte ohne Rahmen, Radius 14. Liegt auf dem Seitengrund, nie weiß auf weiß. */
export function Card({ tone = 'white', padding = 20, media, float, children, style }: CardProps) {
  const theme = useTheme();
  const bg =
    tone === 'inverse'
      ? theme.colors.surfaceInverse
      : tone === 'muted'
        ? theme.colors.surfaceMuted
        : theme.colors.surfaceCard;
  return (
    <View
      style={[
        styles.card,
        { borderRadius: theme.radius.lg, backgroundColor: bg },
        float && [styles.float, { shadowColor: theme.colors.shadow }],
        style,
      ]}
    >
      {media}
      {children ? <View style={{ padding }}>{children}</View> : null}
    </View>
  );
}

export function CardTitle({ children, inverse }: { children: ReactNode; inverse?: boolean }) {
  return (
    <Text variant="title" tone={inverse ? 'onInverse' : 'strong'}>
      {children}
    </Text>
  );
}

export function CardText({ children, inverse }: { children: ReactNode; inverse?: boolean }) {
  return (
    <Text variant="body" tone={inverse ? 'onInverseMuted' : 'body'} style={styles.text}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
  float: {
    shadowOpacity: 0.35,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 20 },
    elevation: 12,
  },
  text: { marginTop: 8 },
});
