import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import type { KeyboardAwareScrollViewRef } from 'react-native-keyboard-controller';

import {
  BotSays,
  ChatInput,
  QuickReplies,
  Thread,
  UserSaid,
  type Reply,
} from '@/components/app/Conversation';
import { DemoHint } from '@/components/app/DemoHint';
import { AppHeader, Button, Screen, Text } from '@/components/ds';
import { guides, type GuideId } from '@/data/guides';
import { de } from '@/i18n/de';
import { appliance, hasGuides } from '@/lib/appliance';
import { chatLimits } from '@/lib/chat/limits';
import { hasProgress } from '@/lib/caseView';
import { deviceTitle } from '@/lib/devices';
import { reportDisplayMessage } from '@/lib/problem';
import type { CaseEntry, Id } from '@/model/types';
import { selectOpenCaseForDevice, useAppStore } from '@/store/appStore';

const t = de.problem;
const g = de.talk.problem;

/** Wo das Gespräch steht, bevor es einen Fall gibt */
type Step = 'geraet' | 'problem' | 'meldung';

const PHOTO = 'foto';
const ADD_DEVICE = 'neues-geraet';

/**
 * Problem melden: der Anfang des Fall-Gesprächs. ganz fragt nach Gerät und Problem, die Antworten
 * stehen unten, eigene Worte gehen direkt an den Reparatur-Assistenten (Entscheidung 12).
 * Sobald es einen Fall gibt, geht es im Gespräch des Falls weiter. Pro Gerät gibt es einen
 * offenen Fall (Entscheidung 13). Kein Link nach außen.
 */
export default function ProblemMelden() {
  const params = useLocalSearchParams<{ geraet?: string; fall?: string }>();
  const store = useAppStore;
  const state = useAppStore();
  const devices = state.devices;
  const resumed = params.fall ? state.cases[params.fall] : undefined;
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
  // Ein offener Fall mit Fortschritt: weitermachen oder neu anfangen
  const [replaceRunning, setReplaceRunning] = useState(false);
  const draft = useRef<Id | undefined>(resumed?.id);
  const scrollRef = useRef<KeyboardAwareScrollViewRef>(null);

  // Ein Fall ohne Inhalt bleibt nicht liegen, wenn man „Problem melden“ verlässt.
  useEffect(() => {
    return () => {
      if (draft.current) store.getState().discardIfEmpty(draft.current);
    };
  }, [store]);

  useEffect(() => {
    const id = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(id);
  }, [step, deviceId]);

  const running = device ? selectOpenCaseForDevice(state, device.id) : undefined;
  const runningWithProgress =
    running && running.id !== resumed?.id && hasProgress(state, running) && !replaceRunning
      ? running
      : undefined;

  /** Legt den Fall an oder nutzt einen Fall ohne Fortschritt weiter. Pro Gerät ein offener Fall. */
  const caseFor = (entry: CaseEntry, problemLabel: string): Id => {
    const s = store.getState();
    const open = selectOpenCaseForDevice(s, device!.id);
    if (open && open.id !== resumed?.id && hasProgress(s, open)) {
      s.runCommand(open.id, 'abbrechen', { cancelReason: de.thread.newProblemReason });
    }
    const reuse = [draft.current ? s.cases[draft.current] : undefined, open].find(
      (x) =>
        x &&
        x.deviceId === device!.id &&
        !hasProgress(s, x) &&
        !['abgebrochen', 'erledigt'].includes(x.status),
    );
    if (reuse) {
      s.updateCase(reuse.id, { entry, problemLabel });
      draft.current = reuse.id;
      return reuse.id;
    }
    const c = s.createCase({ deviceId: device!.id, entry, problemLabel });
    draft.current = c.id;
    return c.id;
  };

  /** Weiter im Gespräch des Falls. Der Fall-Entwurf gehört dann dem Gespräch. */
  const toThread = (id: Id, extra: { weiter?: string; frage?: string } = {}) => {
    draft.current = undefined;
    router.replace({ pathname: '/fall/[id]', params: { id, ...extra } });
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
      toThread(caseFor('foto', t.photoLabel), { weiter: 'kamera' });
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
      toThread(id);
      return;
    }
    const guide = guides[key as GuideId];
    const id = caseFor('symptom', guide.title);
    store.getState().startGuide(id, guide.id);
    toThread(id, { weiter: 'anleitung' });
  };

  const pickMessage = (key: string) => {
    const m = de.displayMessages.find((x) => x.guideId === key);
    if (!m) return;
    const id = caseFor('meldung', m.code);
    reportDisplayMessage(id, m.guideId as GuideId, m.code);
    toThread(id, { weiter: 'anleitung' });
  };

  /** Eigene Worte: Der Reparatur-Assistent antwortet im Gespräch des Falls */
  const submitText = () => {
    const value = text.trim();
    if (value.length < 3) {
      setTextError(t.otherTooShort);
      return;
    }
    if (value.length > chatLimits.chars) {
      setTextError(de.chat.tooLong(chatLimits.chars));
      return;
    }
    toThread(caseFor('freitext', truncated(value)), { frage: value });
  };

  const editDevice = () => {
    setDeviceId(undefined);
    setAnswer(undefined);
    setStep('geraet');
  };
  const editProblem = () => {
    setAnswer(undefined);
    setStep('problem');
  };

  // ---------- Antworten unten ----------

  let replies: Reply[] = [];
  let onPick: (key: string) => void = pickProblem;
  if (step === 'geraet') {
    onPick = pickDevice;
    replies = [
      ...devices.map((d) => ({
        key: d.id,
        label: deviceTitle(d),
        sub: de.deviceCategory[d.category],
      })),
      { key: ADD_DEVICE, label: g.addDevice },
    ];
  } else if (runningWithProgress) {
    onPick = (key) => {
      if (key === 'weiter') toThread(runningWithProgress.id);
      else setReplaceRunning(true);
    };
    replies = [
      { key: 'weiter', label: de.thread.continueCase },
      { key: 'neu', label: de.thread.newProblem },
    ];
  } else if (step === 'meldung') {
    onPick = pickMessage;
    replies = de.displayMessages.map((m) => ({ key: m.guideId, label: m.code, sub: m.hint }));
  } else {
    replies = [
      { key: PHOTO, label: t.photo, sub: t.photoSub },
      ...(guided
        ? de.problems.map((p) => ({ key: p.id, label: p.label, sub: p.sub }))
        : a.symptoms.map((p) => ({ key: p.id, label: p.label, sub: p.sub }))),
    ];
  }

  const inputBar =
    step === 'geraet' || runningWithProgress ? undefined : (
      <ChatInput
        label={de.thread.inputLabel}
        placeholder={a.otherPlaceholder}
        error={textError}
        value={text}
        onChangeText={(v) => {
          setText(v);
          setTextError(undefined);
        }}
        onSend={submitText}
      />
    );

  return (
    <Screen
      header={header}
      footer={<QuickReplies replies={replies} onPick={onPick} footer={inputBar} />}
      scrollRef={scrollRef}
    >
      {guided ? <DemoHint id="problem" /> : null}

      <Thread>
        {askDevice ? <BotSays key="geraet" lines={[g.whichDevice]} /> : null}
        {askDevice && device ? (
          <UserSaid key="geraet-a" text={deviceTitle(device)} onEdit={editDevice} />
        ) : null}
        {!askDevice && device ? (
          <BotSays key="geraet" lines={[g.forDevice(deviceTitle(device))]} />
        ) : null}

        {runningWithProgress ? (
          <BotSays
            key="laeuft"
            lines={[de.thread.runningCase(runningWithProgress.problemLabel)]}
            hint={de.thread.runningCaseAsk}
          />
        ) : step !== 'geraet' ? (
          <BotSays
            key="was"
            lines={[g.whatsUp]}
            hint={de.common.sentences(
              guided ? g.whatsUpHint : g.whatsUpNoGuides,
              de.thread.inputHint,
            )}
          />
        ) : null}

        {answer ? <UserSaid key="antwort" text={answer} onEdit={editProblem} /> : null}
        {step === 'meldung' ? <BotSays key="meldung" lines={[g.whichMessage]} /> : null}
      </Thread>
    </Screen>
  );
}
