// Ein Schritt der Anleitung als Nachricht im Gespräch (Entscheidung 25).
// Schlicht wie die Anleitung (Entscheidung 20): Quelle einmal im ersten Schritt, Werkzeug als Zeile.
// Warnhinweis vor dem Text (B-51).
import { StyleSheet, View } from 'react-native';

import { Card, InfoBox, PhotoFrame, StepProgress, Text } from '@/components/ds';
import { de } from '@/i18n/de';
import { guideTools } from '@/lib/guideMeta';
import type { Guide } from '@/model/types';

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
  const s = guide.steps[step];
  if (!s) return null;
  const tools = guideTools(guide);
  return (
    <Card>
      <View style={styles.stack}>
        {current ? <StepProgress total={guide.steps.length} current={step} /> : null}
        <Text variant="meta">{de.a11y.stepOf(step + 1, guide.steps.length)}</Text>
        {current && s.img ? (
          <PhotoFrame label={s.src ? s.t : (t.images[s.img as keyof typeof t.images] ?? s.t)} />
        ) : null}
        {current && step === 0 ? (
          <Text variant="meta">{t.sourceShort(guide.sourceDocument.split(',')[0]!)}</Text>
        ) : null}
        <Text variant="title" accessibilityRole="header">
          {s.t}
        </Text>
        {s.w ? <InfoBox tone="achtung">{s.w}</InfoBox> : null}
        <Text variant={current ? 'bodyLg' : 'body'}>{s.d}</Text>
        {current && step === 0 && tools.length ? (
          <Text variant="meta">{de.result.tools(tools.join(', '))}</Text>
        ) : current && step > 0 && s.tool ? (
          <Text variant="meta">{de.result.tools(s.tool)}</Text>
        ) : null}
        {current && question ? <Text variant="title">{question}</Text> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 10 },
});
