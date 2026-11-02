// Ein Schritt der Anleitung als Nachricht im Gespräch (Entscheidung 16).
// Inhalte wörtlich aus der Anleitung. Warnhinweis vor dem Text (B-51).
import { StyleSheet, View } from 'react-native';

import { Card, Icon, InfoBox, PhotoFrame, StepProgress, Text } from '@/components/ds';
import { de } from '@/i18n/de';
import type { Guide } from '@/model/types';
import { useTheme } from '@/theme';

const t = de.guide;

interface GuideStepCardProps {
  guide: Guide;
  step: number;
  /** Der Schritt, an dem du gerade bist: mit Bild, Werkzeug und Fortschritt */
  current: boolean;
  /** Frage zum Schritt, z. B. am letzten Schritt einer Störung */
  question?: string;
}

export function GuideStepCard({ guide, step, current, question }: GuideStepCardProps) {
  const theme = useTheme();
  const s = guide.steps[step];
  if (!s) return null;
  return (
    <Card>
      <View style={styles.stack}>
        {current ? <StepProgress total={guide.steps.length} current={step} /> : null}
        <Text variant="meta">{de.a11y.stepOf(step + 1, guide.steps.length)}</Text>
        {current && s.img ? (
          <PhotoFrame label={t.images[s.img as keyof typeof t.images] ?? s.t} />
        ) : null}
        <Text variant="title" accessibilityRole="header">
          {s.t}
        </Text>
        {s.w ? <InfoBox tone="achtung">{s.w}</InfoBox> : null}
        <Text variant={current ? 'bodyLg' : 'body'}>{s.d}</Text>
        {current && s.tool ? (
          <View
            style={[styles.tool, { borderColor: theme.colors.borderSubtle }]}
            accessible
            accessibilityLabel={de.a11y.fact(t.youNeed, s.tool)}
          >
            <Icon name="forward" size={18} color="textMuted" />
            <View style={styles.toolText}>
              <Text variant="meta">{t.youNeed}</Text>
              <Text variant="label">{s.tool}</Text>
            </View>
          </View>
        ) : null}
        {current && question ? <Text variant="title">{question}</Text> : null}
        {current ? <Text variant="caption">{t.sourceDocument(guide.sourceDocument)}</Text> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 10 },
  tool: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toolText: { flex: 1 },
});
