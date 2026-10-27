import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import type { KeyboardAwareScrollViewRef } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CaseScreen, useCaseId } from '@/components/app/CaseScreen';
import { BotSays, QuickReplies, Typing, UserSaid, type Reply } from '@/components/app/Conversation';
import { Button, InfoBox, Text, TextField } from '@/components/ds';
import { demoConfig } from '@/config/demo.config';
import { guides, type GuideId } from '@/data/guides';
import { de } from '@/i18n/de';
import { caseAppliance } from '@/lib/appliance';
import { latestGuideRun } from '@/lib/caseView';
import { chatContext, hasChatConsent } from '@/lib/chat/context';
import { chatLimits } from '@/lib/chat/limits';
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

  // Vorschläge des Assistenten und Auswege bei Fehlern stehen als Antwort-Buttons unten
  const replies: Reply[] = [];
  if (!consent) {
    replies.push({ key: 'einverstanden', label: t.consentAccept });
    replies.push({ key: 'hilfe', label: t.consentDecline });
  } else if (error) {
    if (last?.role === 'haushalt' && retryable.includes(error)) {
      replies.push({ key: 'nochmal', label: t.retry });
    }
    if (canHelp) replies.push({ key: 'hilfe', label: t.getHelp });
  } else if (!pending && last?.role === 'assistent') {
    if (last.suggestion === 'anleitung' && canGuide && last.guideId && last.guideId in guides) {
      const guide = guides[last.guideId as GuideId];
      const back = guideActive && run.guideId === guide.id;
      replies.push({
        key: `anleitung:${guide.id}`,
        label: back ? t.backToGuide(guide.title) : t.startGuide(guide.title),
      });
    }
    if (last.suggestion === 'hilfe' && canHelp) replies.push({ key: 'hilfe', label: t.getHelp });
  }

  const pick = (key: string) => {
    if (key === 'einverstanden') accept();
    else if (key === 'hilfe') help();
    else if (key === 'nochmal') void ask();
    else if (key.startsWith('anleitung:')) openGuide(key.slice('anleitung:'.length) as GuideId);
  };

  const inputBar = consent ? (
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

  const footer = replies.length ? (
    <QuickReplies replies={replies} onPick={pick} footer={inputBar} />
  ) : (
    inputBar
  );

  return (
    <CaseScreen title={t.title} footer={footer} scrollRef={scrollRef}>
      <BotSays name={t.title} lines={[t.intro]} hint={t.who} />

      {consent ? null : (
        <BotSays sender={false} lines={[t.consentTitle]}>
          <Text variant="bodyLg">{t.consentText(demoConfig.assistant.name)}</Text>
          <Text variant="meta">{t.consentBasis}</Text>
        </BotSays>
      )}

      {messages.map((m, i) =>
        m.role === 'haushalt' ? (
          <UserSaid key={m.id} text={m.text} />
        ) : (
          <BotSays
            key={m.id}
            name={t.title}
            sender={messages[i - 1]?.role !== 'assistent'}
            lines={[m.text]}
          />
        ),
      )}

      {pending ? <Typing label={t.typing} /> : null}
      {error ? <InfoBox>{t.errors[error]}</InfoBox> : null}
      {full ? <InfoBox>{t.full}</InfoBox> : null}
    </CaseScreen>
  );
}

const styles = StyleSheet.create({
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputField: { flex: 1 },
});
