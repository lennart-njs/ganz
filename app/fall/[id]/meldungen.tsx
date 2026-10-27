import { Pressable, StyleSheet, View } from 'react-native';

import { CaseScreen, useCaseId } from '@/components/app/CaseScreen';
import { Icon, Text } from '@/components/ds';
import type { GuideId } from '@/data/guides';
import { de } from '@/i18n/de';
import { reportDisplayMessage } from '@/lib/problem';
import { useTheme } from '@/theme';

/** Meldung im Display: 8 Meldungen aus der Demo. Ein Tap startet die passende Anleitung. */
export default function Meldungen() {
  const theme = useTheme();
  const caseId = useCaseId();

  const pick = (guideId: GuideId, code: string) => reportDisplayMessage(caseId, guideId, code);

  return (
    <CaseScreen title={de.screens.meldungen}>
      <Text variant="h1" accessibilityRole="header">
        {de.messages.title}
      </Text>
      <View>
        {de.displayMessages.map((m) => (
          <Pressable
            key={m.code}
            accessibilityRole="button"
            accessibilityLabel={de.a11y.withSub(m.code, m.hint)}
            onPress={() => pick(m.guideId as GuideId, m.code)}
            style={({ pressed }) => [
              styles.row,
              { borderColor: theme.colors.borderSubtle, opacity: pressed ? 0.6 : 1 },
            ]}
          >
            {/* Kleines Display als Erkennungszeichen, ohne Bedeutung für den Screenreader */}
            <View
              style={[styles.display, { backgroundColor: theme.colors.photoInk }]}
              accessible={false}
            >
              <View style={[styles.displayLine, { backgroundColor: theme.colors.onPhoto }]} />
            </View>
            <View style={styles.text}>
              <Text variant="label">{m.code}</Text>
              <Text variant="meta">{m.hint}</Text>
            </View>
            <Icon name="forward" size={18} color="textMuted" />
          </Pressable>
        ))}
      </View>
    </CaseScreen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 14,
    minHeight: 68,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  display: {
    width: 44,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  displayLine: { width: 22, height: 3, borderRadius: 2 },
  text: { flex: 1 },
});
