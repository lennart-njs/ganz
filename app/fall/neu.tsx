import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { KeyboardAwareScrollViewRef } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BotSays, QuickReplies, UserSaid, type Reply } from '@/components/app/Conversation';
import { DemoHint } from '@/components/app/DemoHint';
import { AppHeader, Button, Screen, Text, TextField } from '@/components/ds';
import { guides, type GuideId } from '@/data/guides';
import { de } from '@/i18n/de';
import { appliance, hasGuides } from '@/lib/appliance';
import { deviceTitle } from '@/lib/devices';
import { reportDisplayMessage } from '@/lib/problem';
import type { CaseEntry, Id } from '@/model/types';
import { useAppStore } from '@/store/appStore';
import { useTheme } from '@/theme';

const t = de.problem;
const g = de.talk.problem;

/** Wo das Gespräch steht. Nur Schritte im Gespräch selbst, alles andere führt aus dem Screen. */
type Step = 'geraet' | 'problem' | 'meldung' | 'freitext' | 'weiter';

const PHOTO = 'foto';
const OTHER = 'anderes';
const ASSISTANT = 'assistent';
const HELP = 'hilfe';
const ADD_DEVICE = 'neues-geraet';

/**
 * Problem melden als Gespräch: ganz fragt nach Gerät und Problem, die Antworten stehen unten.
 * Mit dem Stift lässt sich jede Antwort ändern. Foto, Meldung im Display, Symptom oder
 * „Etwas anderes“ (B-54). Kein Link nach außen.
 */
export default function ProblemMelden() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ geraet?: string; fall?: string }>();
  const store = useAppStore;
  const devices = useAppStore((s) => s.devices);
  const resumed = useAppStore((s) => (params.fall ? s.cases[params.fall] : undefined));
  const fixedDevice = params.geraet ?? resumed?.deviceId;
  const askDevice = !fixedDevice && devices.length > 1;
  const [deviceId, setDeviceId] = useState<string | undefined>(
    fixedDevice ?? (askDevice ? undefined : devices[0]?.id),
  );
  const device = devices.find((d) => d.id === deviceId);
  const [step, setStep] = useState<Step>(device ? 'problem' : 'geraet');
  const [answer, setAnswer] = useState<string>();
  const [text, setText] = useState('');
  const [textError, setTextError] = useState<string>();
  const [described, setDescribed] = useState<string>();
  const draft = useRef<Id | undefined>(resumed?.id);
  const scrollRef = useRef<KeyboardAwareScrollViewRef>(null);

  // Ein Fall ohne Inhalt bleibt nicht liegen, wenn man „Problem melden“ verlässt.
  useEffect(() => {
    return () => {
      if (draft.current) store.getState().discardIfEmpty(draft.current);
    };
  }, [store]);

  // Jede neue Frage ist sichtbar
  useEffect(() => {
    const id = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(id);
  }, [step]);

  /** Legt den Fall an oder nutzt den leeren Entwurf weiter */
  const caseFor = (entry: CaseEntry, problemLabel: string): Id => {
    const s = store.getState();
    const existing = draft.current ? s.cases[draft.current] : undefined;
    if (existing && existing.status === 'offen' && existing.deviceId === device!.id) {
      s.updateCase(existing.id, { entry, problemLabel });
      return existing.id;
    }
    if (existing) s.discardIfEmpty(existing.id);
    const c = s.createCase({ deviceId: device!.id, entry, problemLabel });
    draft.current = c.id;
    return c.id;
  };

  const header = <AppHeader title={de.screens.problem} onBack={() => router.back()} />;

  if (devices.length === 0) {
    return (
      <Screen header={header}>
        <Text variant="body">{t.noDevice}</Text>
        <Button label={de.home.addDevice} onPress={() => router.replace('/geraet/neu')} />
      </Screen>
    );
  }

  const guided = hasGuides(device?.category);
  const a = appliance(device?.category);
  const truncated = (s: string) => (s.length > 60 ? `${s.slice(0, 57)}…` : s);

  // ---------- Antworten ----------

  const pickDevice = (key: string) => {
    if (key === ADD_DEVICE) {
      router.push('/geraet/neu');
      return;
    }
    setDeviceId(key);
    setStep('problem');
  };

  const pickProblem = (key: string) => {
    if (key === PHOTO) {
      const id = caseFor('foto', t.photoLabel);
      router.push(`/fall/${id}/kamera`);
      return;
    }
    if (key === ASSISTANT) {
      const id = caseFor('freitext', de.chat.entryLabel);
      router.push(`/fall/${id}/chat`);
      return;
    }
    if (key === OTHER) {
      setAnswer(t.other);
      setStep('freitext');
      return;
    }
    if (key === 'meldung') {
      setAnswer(de.problems[0]!.label);
      setStep('meldung');
      return;
    }
    // Ohne Anleitung (alle Geräte außer der Waschmaschine): gleich Hilfe holen
    if (!guided) {
      const label = a.symptoms.find((x) => x.id === key)?.label ?? key;
      const id = caseFor('symptom', label);
      store.getState().escalate(id);
      router.push(`/fall/${id}/hilfe`);
      return;
    }
    const guide = guides[key as GuideId];
    const id = caseFor('symptom', guide.title);
    store.getState().startGuide(id, guide.id);
    router.push(`/fall/${id}/anleitung`);
  };

  const pickMessage = (key: string) => {
    const m = de.displayMessages.find((x) => x.guideId === key);
    if (!m) return;
    const id = caseFor('meldung', m.code);
    reportDisplayMessage(id, m.guideId as GuideId, m.code);
  };

  const submitText = () => {
    const value = text.trim();
    if (value.length < 3) {
      setTextError(t.otherTooShort);
      return;
    }
    setDescribed(value);
    setStep('weiter');
  };

  const pickNext = (key: string) => {
    const value = described ?? '';
    if (key === ASSISTANT) {
      const id = caseFor('freitext', truncated(value));
      router.push({ pathname: '/fall/[id]/chat', params: { id, entwurf: value } });
      return;
    }
    const id = caseFor('freitext', truncated(value));
    const s = store.getState();
    s.addEvent({
      caseId: id,
      type: 'rueckfrage_beantwortet',
      actor: { kind: 'haushalt', id: s.persons[0]?.id },
      payload: { question: t.otherTitle, answer: value },
    });
    s.escalate(id);
    router.push(`/fall/${id}/hilfe`);
  };

  // ---------- Ändern ----------

  const editDevice = () => {
    setDeviceId(undefined);
    setAnswer(undefined);
    setDescribed(undefined);
    setStep('geraet');
  };
  const editProblem = () => {
    setAnswer(undefined);
    setDescribed(undefined);
    setStep('problem');
  };
  const editText = () => {
    setText(described ?? '');
    setDescribed(undefined);
    setStep('freitext');
  };

  // ---------- Antworten unten ----------

  const problemReplies: Reply[] = [
    { key: PHOTO, label: t.photo, sub: t.photoSub },
    ...(guided
      ? de.problems.map((p) => ({ key: p.id, label: p.label, sub: p.sub }))
      : a.symptoms.map((p) => ({ key: p.id, label: p.label, sub: p.sub }))),
    { key: OTHER, label: t.other, sub: t.otherSub },
    { key: ASSISTANT, label: de.chat.entry, sub: de.chat.entrySub },
  ];

  let footer;
  if (step === 'geraet') {
    footer = (
      <QuickReplies
        replies={[
          ...devices.map((d) => ({
            key: d.id,
            label: deviceTitle(d),
            sub: de.deviceCategory[d.category],
          })),
          { key: ADD_DEVICE, label: g.addDevice },
        ]}
        onPick={pickDevice}
      />
    );
  } else if (step === 'problem') {
    footer = <QuickReplies replies={problemReplies} onPick={pickProblem} />;
  } else if (step === 'meldung') {
    footer = (
      <QuickReplies
        replies={de.displayMessages.map((m) => ({ key: m.guideId, label: m.code, sub: m.hint }))}
        onPick={pickMessage}
      />
    );
  } else if (step === 'weiter') {
    footer = (
      <QuickReplies
        replies={[
          { key: HELP, label: g.help, sub: g.helpSub },
          { key: ASSISTANT, label: g.assistant, sub: g.assistantSub },
        ]}
        onPick={pickNext}
      />
    );
  } else {
    footer = (
      <View
        style={[
          styles.inputBar,
          {
            paddingHorizontal: theme.gutter,
            paddingBottom: Math.max(insets.bottom, 12) + 8,
            borderTopColor: theme.colors.borderSubtle,
            backgroundColor: theme.colors.bgPage,
          },
        ]}
      >
        <View style={styles.input}>
          <TextField
            label={t.otherLabel}
            labelHidden
            placeholder={a.otherPlaceholder}
            error={textError}
            multiline
            rows={1}
            value={text}
            autoFocus
            onChangeText={(v) => {
              setText(v);
              setTextError(undefined);
            }}
          />
        </View>
        <Button label={g.send} onPress={submitText} />
      </View>
    );
  }

  return (
    <Screen header={header} footer={footer} scrollRef={scrollRef}>
      {guided ? <DemoHint id="problem" /> : null}

      {askDevice ? (
        <>
          <BotSays lines={[g.whichDevice]} />
          {device ? <UserSaid text={deviceTitle(device)} onEdit={editDevice} /> : null}
        </>
      ) : device ? (
        <BotSays lines={[g.forDevice(deviceTitle(device))]} />
      ) : null}

      {step !== 'geraet' ? (
        <BotSays
          sender={askDevice}
          lines={[g.whatsUp]}
          hint={guided ? g.whatsUpHint : g.whatsUpNoGuides}
        />
      ) : null}

      {answer ? <UserSaid text={answer} onEdit={editProblem} /> : null}
      {step === 'meldung' ? <BotSays lines={[g.whichMessage]} /> : null}
      {step === 'freitext' || step === 'weiter' ? <BotSays lines={[g.describe]} /> : null}
      {step === 'weiter' && described ? (
        <>
          <UserSaid text={described} onEdit={editText} />
          <BotSays lines={[g.next]} />
        </>
      ) : null}
    </Screen>
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
  input: { flex: 1 },
});
