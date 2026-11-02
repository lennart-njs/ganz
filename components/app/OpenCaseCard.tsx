import { StyleSheet, View } from 'react-native';

import { Button, Text } from '@/components/ds';
import { de } from '@/i18n/de';
import { useTheme } from '@/theme';

interface OpenCaseCardProps {
  caseId: string;
  title: string;
  detail: string;
  onContinue: () => void;
}

/**
 * Offener Fall oben auf der Startseite (Q-1, B-03). Im mach’s-Look: helle Akzentfläche,
 * Statuszeile mit Punkt, blaue Hauptaktion (wie die Karten auf machs.io).
 */
export function OpenCaseCard({ caseId, title, detail, onContinue }: OpenCaseCardProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.colors.actionSoft, borderRadius: theme.radius.group + 8 },
      ]}
    >
      <View style={styles.body} accessible accessibilityRole="summary">
        <View style={styles.status}>
          <View
            style={[
              styles.dot,
              { backgroundColor: theme.colors.actionPrimary, borderRadius: theme.radius.pill },
            ]}
          />
          <Text variant="meta" tone="body">
            {de.home.openCaseLabel(caseId)}
          </Text>
        </View>
        <Text variant="title">{title}</Text>
        <Text variant="body" tone="muted">
          {detail}
        </Text>
      </View>
      <Button label={de.home.continueCase} fullWidth onPress={onContinue} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 20, gap: 16 },
  body: { gap: 6 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8 },
});
