// Einwilligung in den Reparatur-Assistenten (lit. a, Entscheidung 38). Derselbe Text im Profil unter
// „Freiwillig“ und im Sheet, solange die Einwilligung fehlt. Ihn stempelt assistent_einwilligung
// (lib/legalTexts.ts). Im Gespräch selbst steht kein Hinweis mehr.
import { StyleSheet, View } from 'react-native';

import { Button, Sheet, Text } from '@/components/ds';
import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';

import { ScopeItems } from './ScopeItems';

const t = de.chat;

/** Der Text der Einwilligung ohne Überschrift: wer antwortet, was der Anbieter bekommt, Grundlage */
export function AssistantConsentText() {
  return (
    <View style={styles.text}>
      <Text variant="body">{t.who}</Text>
      <View>
        <Text variant="body">{t.consentText(demoConfig.assistant.name)}</Text>
        <ScopeItems purpose="chat_assistent" />
      </View>
      <Text variant="body">{t.consentExcluded}</Text>
      <Text variant="meta">{t.consentBasis}</Text>
    </View>
  );
}

/**
 * Nach der ersten Nachricht ohne Einwilligung: der Text und die Wahl. „Einverstanden“ speichert die
 * Einwilligung und schickt die Nachricht, „Lieber eine Fachkraft“ macht sie zur Notiz.
 */
export function AssistantConsentSheet({
  visible,
  onAccept,
  onDecline,
  onClose,
}: {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet visible={visible} onClose={onClose} title={t.consentTitle}>
      <AssistantConsentText />
      <Button label={t.consentAccept} size="lg" fullWidth onPress={onAccept} />
      <Button label={t.consentDecline} variant="secondary" fullWidth onPress={onDecline} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  text: { gap: 8 },
});
