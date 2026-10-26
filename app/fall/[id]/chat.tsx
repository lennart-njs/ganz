import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, StyleSheet, View } from 'react-native';
import type { KeyboardAwareScrollViewRef } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CaseScreen, useCaseId } from '@/components/app/CaseScreen';
import { Button, Card, InfoBox, Text, TextField } from '@/components/ds';
import { demoConfig } from '@/config/demo.config';
import { guides, type GuideId } from '@/data/guides';
import { de } from '@/i18n/de';
import { caseAppliance } from '@/lib/appliance';
import { latestGuideRun } from '@/lib/caseView';
import { chatContext, hasChatConsent } from '@/lib/chat/context';
import { chatLimits } from '@/lib/chat/limits';
import type { ChatMessage } from '@/model/types';
import { services, type ChatError } from '@/services';
import { useAppStore } from '@/store/appStore';
import { useTheme } from '@/theme';

const t = de.chat;
const CONSENT_TEXT_VERSION = '2026-10-1';
/** Bei diesen Fehlern lohnt ein zweiter Versuch. Fehlt der Schlüssel, hilft nur die Fachkraft. */
const retryable: ChatError[] = ['ausgelastet', 'netz', 'dienst'];

/**
 * Reparatur-Assistent: Gespräch mit Claude über den eigenen Server.
 * Erst nach Einwilligung. Vorschläge erscheinen als Button: Anleitung starten oder Hilfe holen.
 */
export default function Chat() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const caseId = useCaseId();
  const params = useLocalSearchParams<{ entwurf?: string }>();
  const state = useAppStore();
  const c = state.cases[caseId];
  const messages = state.chatMessages.filter((m) => m.caseId === caseId);
  const consent = hasChatConsent(state);
  const appliance = caseAppliance(state, caseId);
  const [input, setInput] = useState(params.entwurf ?? '');
  const [inputError, setInputError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ChatError>();
  const scrollRef = useRef<KeyboardAwareScrollViewRef>(null);

  // Neue Nachrichten und die offene Tastatur zeigen immer das Ende des Gesprächs
  useEffect(() => {
    const id = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(id);
  }, [messages.length, pending, error]);
  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidShow', () =>
      scrollRef.current?.scrollToEnd({ animated: true }),
    );
    return () => sub.remove();
  }, []);

  if (!c) return null;

  const full = messages.length >= chatLimits.messages - 1;
  const last = messages.at(-1);

  const ask = async () => {
    const st = useAppStore.getState();
    const context = chatContext(st, caseId);
    if (!context) return;
    const history = st.chatMessages
      .filter((m) => m.caseId === caseId)
      .map((m) => ({ role: m.role, text: m.text }));
    // Die Anfrage beginnt mit einer Nachricht des Haushalts
    const start = history.findIndex((m, i) => m.role === 'haushalt' && i >= history.length - 30);
    setPending(true);
    setError(undefined);
    const result = await services.chat.ask(context, history.slice(Math.max(start, 0)));
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const { reply, suggestion, guideId } = result.reply;
    useAppStore.getState().addChatMessage({
      caseId,
      role: 'assistent',
      text: reply,
      suggestion: suggestion === 'keine' ? undefined : suggestion,
      guideId: guideId || undefined,
    });
  };

  const send = () => {
    const text = input.trim();
    if (!text || pending || full) return;
    if (text.length > chatLimits.chars) {
      setInputError(t.tooLong(chatLimits.chars));
      return;
    }
    const st = useAppStore.getState();
    st.addChatMessage({ caseId, role: 'haushalt', text });
    // Ein Fall aus „Reparatur-Assistent fragen“ bekommt die erste Frage als Problem
    if (st.cases[caseId]?.problemLabel === t.entryLabel) {
      st.updateCase(caseId, { problemLabel: text.length > 60 ? `${text.slice(0, 57)}…` : text });
    }
    setInput('');
    void ask();
  };

  const accept = () => {
    useAppStore.getState().grantConsent({
      caseId,
      purpose: 'chat_assistent',
      legalBasis: 'einwilligung',
      recipient: {
        id: demoConfig.assistant.id,
        kind: 'dienstleister',
        name: demoConfig.assistant.name,
      },
      dataCategories: [...de.consentData.assistent],
      textVersion: CONSENT_TEXT_VERSION,
    });
  };

  const help = () => {
    useAppStore.getState().escalate(caseId);
    router.push(`/fall/${caseId}/hilfe`);
  };

  const run = latestGuideRun(state, c);
  const guideActive = run && !run.endedAt;
  const openGuide = (guideId: GuideId) => {
    // Kommt die Frage aus genau dieser Anleitung, geht es dorthin zurück
    if (guideActive && run.guideId === guideId) {
      router.back();
      return;
    }
    const st = useAppStore.getState();
    if (!st.cases[caseId]?.guideRunIds.length) {
      st.updateCase(caseId, { problemLabel: guides[guideId].title });
    }
    st.startGuide(caseId, guideId);
    router.push(`/fall/${caseId}/anleitung`);
  };

  const canGuide = c.status === 'offen' || c.status === 'selbsthilfe';
  const canHelp = canGuide || c.status === 'eskaliert';
  const action = (m: ChatMessage) => {
    if (m !== last) return null;
    if (m.suggestion === 'anleitung' && canGuide && m.guideId && m.guideId in guides) {
      const guide = guides[m.guideId as GuideId];
      const back = guideActive && run.guideId === guide.id;
      return (
        <Button
          label={back ? t.backToGuide(guide.title) : t.startGuide(guide.title)}
          onPress={() => openGuide(guide.id as GuideId)}
        />
      );
    }
    if (m.suggestion === 'hilfe' && canHelp) {
      return <Button label={t.getHelp} icon="video" onPress={help} />;
    }
    return null;
  };

  const footer = consent ? (
    <View
      style={[
        styles.inputBar,
        {
          paddingBottom: Math.max(insets.bottom, 12) + 8,
          paddingHorizontal: theme.gutter,
          borderTopColor: theme.colors.borderSubtle,
          backgroundColor: theme.colors.bgPage,
        },
      ]}
    >
      <View style={styles.inputField}>
        <TextField
          label={t.inputLabel}
          labelHidden
          placeholder={appliance.otherPlaceholder}
          multiline
          rows={1}
          value={input}
          error={inputError}
          editable={!full}
          onChangeText={(v) => {
            setInput(v);
            setInputError(undefined);
          }}
        />
      </View>
      <Button label={t.send} disabled={!input.trim() || pending || full} onPress={send} />
    </View>
  ) : undefined;

  return (
    <CaseScreen title={t.title} footer={footer} scrollRef={scrollRef}>
      <Text variant="body">{t.intro}</Text>
      <Text variant="meta">{t.who}</Text>

      {consent ? null : (
        <Card>
          <View style={styles.consent}>
            <Text variant="title" accessibilityRole="header">
              {t.consentTitle}
            </Text>
            <Text variant="body">{t.consentText(demoConfig.assistant.name)}</Text>
            <Text variant="meta">{t.consentBasis}</Text>
            <Button label={t.consentAccept} fullWidth onPress={accept} />
            <Button label={t.consentDecline} variant="secondary" fullWidth onPress={help} />
          </View>
        </Card>
      )}

      {messages.map((m) => {
        const mine = m.role === 'haushalt';
        return (
          <View key={m.id} style={[styles.row, mine ? styles.mine : styles.theirs]}>
            <View
              accessible
              accessibilityLabel={t.message(mine ? t.you : t.assistant, m.text)}
              style={[
                styles.bubble,
                {
                  borderRadius: theme.radius.lg,
                  backgroundColor: mine ? theme.colors.surfaceInverse : theme.colors.surfaceCard,
                },
              ]}
            >
              <Text variant="body" tone={mine ? 'onInverse' : 'body'}>
                {m.text}
              </Text>
            </View>
            {action(m)}
          </View>
        );
      })}

      {pending ? (
        <View style={styles.typing} accessibilityLiveRegion="polite" accessible>
          <ActivityIndicator color={theme.colors.textMuted} />
          <Text variant="meta">{t.typing}</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.error}>
          <InfoBox>{t.errors[error]}</InfoBox>
          {last?.role === 'haushalt' && retryable.includes(error) ? (
            <Button label={t.retry} variant="secondary" onPress={() => void ask()} />
          ) : null}
          {canHelp ? <Button label={t.getHelp} icon="video" onPress={help} /> : null}
        </View>
      ) : null}

      {full ? <InfoBox>{t.full}</InfoBox> : null}
    </CaseScreen>
  );
}

const styles = StyleSheet.create({
  consent: { gap: 12 },
  row: { gap: 8 },
  mine: { alignItems: 'flex-end' },
  theirs: { alignItems: 'flex-start' },
  bubble: { maxWidth: '88%', paddingHorizontal: 14, paddingVertical: 10 },
  typing: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  error: { gap: 10 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputField: { flex: 1 },
});
