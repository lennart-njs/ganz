import { StyleSheet, View } from 'react-native';

import { Button, Card, Text } from '@/components/ds';
import { de } from '@/i18n/de';

interface OpenCaseCardProps {
  caseId: string;
  title: string;
  detail: string;
  onContinue: () => void;
}

/** Offener Fall oben auf der Startseite (Q-1, B-03) */
export function OpenCaseCard({ caseId, title, detail, onContinue }: OpenCaseCardProps) {
  return (
    <Card tone="inverse">
      <View style={styles.body} accessible accessibilityRole="summary">
        <Text variant="meta" tone="onInverseMuted">
          {de.home.openCaseLabel(caseId)}
        </Text>
        <Text variant="title" tone="onInverse">
          {title}
        </Text>
        <Text variant="body" tone="onInverseMuted">
          {detail}
        </Text>
      </View>
      <Button label={de.home.continueCase} variant="inverse" fullWidth onPress={onContinue} />
    </Card>
  );
}

const styles = StyleSheet.create({
  body: { gap: 4, marginBottom: 16 },
});
