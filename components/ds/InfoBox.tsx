import { StyleSheet, View } from 'react-native';
import type { ReactNode } from 'react';

import { de } from '@/i18n/de';
import { useTheme } from '@/theme';

import { Icon } from './Icon';
import { Text } from './Text';

interface InfoBoxProps {
  /** 'achtung' für Sicherheitshinweise: dunkler Block, Dreieck und Wort, steht vor dem Schritttext (B-51) */
  tone?: 'info' | 'achtung';
  children: ReactNode;
}

export function InfoBox({ tone = 'info', children }: InfoBoxProps) {
  const theme = useTheme();
  const warn = tone === 'achtung';
  return (
    <View
      accessible
      style={[
        styles.box,
        {
          borderRadius: theme.radius.lg,
          backgroundColor: warn ? theme.colors.surfaceInverse : theme.colors.surfaceMuted,
        },
      ]}
    >
      {warn ? (
        <View style={styles.head}>
          <Icon name="warning" size={20} color="textOnInverse" />
          <Text variant="labelStrong" tone="onInverse">
            {de.ds.attention}
          </Text>
        </View>
      ) : null}
      <Text variant="body" tone={warn ? 'onInverse' : 'body'}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { paddingHorizontal: 16, paddingVertical: 14, gap: 6 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
