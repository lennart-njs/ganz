import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import type { KeyboardAwareScrollViewRef } from 'react-native-keyboard-controller';

import { ChatInput } from '@/components/app/ChatInput';
import { BotSays, QuickReplies, UserSaid, type Reply } from '@/components/app/Conversation';
import { DemoHint } from '@/components/app/DemoHint';
import { AppHeader, Button, Screen, Text, useReduceMotion } from '@/components/ds';
import { getGuide } from '@/lib/guideCatalog';
import { de } from '@/i18n/de';
import { appliance, deviceGuides } from '@/lib/appliance';
import { chatLimits } from '@/lib/chat/limits';
import { deviceTitle } from '@/lib/devices';
import { reportDisplayMessage } from '@/lib/problem';
import { planOpenCase, type OpenCaseOptions } from '@/model/policies/openCase';
import type { CaseEntry, Id } from '@/model/types';
import { useAppStore } from '@/store/appStore';

const t = de.problem;
const g = de.talk.problem;

/** Wo das Gespräch steht, bevor es einen Fall gibt */
type Step = 'geraet' | 'problem' | 'meldung';

const PHOTO = 'foto';
const ADD_DEVICE = 'neues-geraet';

/**
 * Problem melden: der Anfang des Fall-Gesprächs. mach’s fragt nach Gerät und Problem, die Antworten
 * stehen unten, eigene Worte gehen direkt an den Reparatur-Assistenten (Entscheidung 12).
 * Sobald es einen Fall gibt, geht es im Gespräch des Falls weiter. Pro Gerät gibt es einen
 * offenen Fall (Entscheidung 13): Läuft einer mit Fortschritt, fragt mach’s zuerst danach, auch für
 * eine Pflege aus dem Gerätedetail (pflege). Kein Link nach außen.
 */
export default function ProblemMelden() {
  const params = useLocalSearchParams<{ geraet?: string; fall?: string; pflege?: string }>();
  const store = useAppStore;
  const state = useAppStore();
  const devices = state.devices;
  const resumed = params.fall ? state.cases[params.fall] : undefined;
  // Pflege aus dem Gerätedetail, während ein Fall mit Fortschritt läuft
  const maintenance = de.maintenance.find((m) => m.guideId === params.pflege);
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
  // „Neues Problem melden“ beim laufenden Fall gewählt
  const [newProblem, setNewProblem] = useState(false);
  const draft = useRef<Id | undefined>(resumed?.id);
  const scrollRef = useRef<KeyboardAwareScrollViewRef>(null);
  const reduceMotion = useReduceMotion();

  // Ein Fall ohne Inhalt bleibt nicht liegen, wenn man „Problem melden“ verlässt.
  useEffect(() => {
    return () => {
      if (draft.current) store.getState().discardIfEmpty(draft.current);
    };
  }, [store]);

  useEffect(() => {
    const id = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: !reduceMotion }), 50);
    return () => clearTimeout(id);
  }, [step, deviceId, reduceMotion]);

  // Entscheidung Nr. 13 steht in model/policies/openCase.ts. Mit Fortschritt fragt mach’s zuerst,
  // ob du weitermachen willst. „Neues Problem melden“ gibt es nur, wo der Fall abbrechbar ist.
  // Stift und „Passt nicht“ ändern das Problem des eigenen Falls (aendern).
  const openOptions = { aendern: resumed?.id, neuesProblem: newProblem };
  const plan = device ? planOpenCase(state, device.id, openOptions) : undefined;
  const running = plan?.art === 'frage_weitermachen' ? state.cases[plan.caseId] : undefined;
  const canReplace = plan?.art === 'frage_weitermachen' && plan.canCancel;

  /** Öffnet den Fall über openCaseFor und geht weiter. Bei der Frage bleibt alles, wie es ist. */
  const withCase = (
    entry: CaseEntry,
    problemLabel: string,
    then: (id: Id) => void,
    options: OpenCaseOptions = openOptions,
  ) => {
    const r = store.getState().openCaseFor(device!.id, entry, problemLabel, options);
    if (!r.ok || r.value.art === 'frage_weitermachen') return;
    draft.current = r.value.caseId;
    then(r.value.caseId);
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

  const set = deviceGuides(device);
  const guided = !!set;
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
      withCase('foto', t.photoLabel, (id) => toThread(id, { weiter: 'kamera' }));
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
      withCase('symptom', label, (id) => {
        store.getState().escalate(id);
        toThread(id);
      });
      return;
    }
    const problem = set?.problems.find((x) => x.id === key);
    const guide = problem ? getGuide(problem.guideId) : undefined;
    if (!guide) return;
    withCase(
      'symptom',
      guide.title,
      (id) => {
        store.getState().startGuide(id, guide.id);
        toThread(id);
      },
      { ...openOptions, guideId: guide.id },
    );
  };

  const pickMessage = (key: string) => {
    const m = set?.messages.find((x) => x.code === key);
    if (!m) return;
    withCase(
      'meldung',
      m.code,
      (id) => {
        reportDisplayMessage(id, m.guideId, m.code);
        toThread(id);
      },
      { ...openOptions, guideId: m.guideId },
    );
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
    withCase('freitext', truncated(value), (id) => toThread(id, { frage: value }));
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
  } else if (running) {
    onPick = (key) => {
      if (key !== 'weiter' && maintenance) {
        // Pflege statt des laufenden Falls: die Anleitung läuft im Gespräch (Entscheidung 25)
        withCase(
          'pflege',
          maintenance.title,
          (id) => {
            store.getState().startGuide(id, maintenance.guideId);
            toThread(id);
          },
          { ...openOptions, neuesProblem: true, guideId: maintenance.guideId },
        );
        return;
      }
      if (key !== 'weiter') {
        setNewProblem(true);
        return;
      }
      // Weitermachen setzt auch einen pausierten Fall fort
      if (running.pausedAt) store.getState().resumeCase(running.id);
      toThread(running.id);
    };
    replies = [
      { key: 'weiter', label: de.thread.continueCase },
      ...(canReplace ? [{ key: 'neu', label: de.thread.newProblem }] : []),
    ];
  } else if (step === 'meldung') {
    onPick = pickMessage;
    replies = (set?.messages ?? []).map((m) => ({ key: m.code, label: m.code, sub: m.hint }));
  } else {
    replies = [
      { key: PHOTO, label: t.photo, sub: t.photoSub },
      ...(set && set.messages.length > 0
        ? [
            {
              key: 'meldung',
              label: de.problems[0]!.label,
              sub: set.care ? de.problems[0]!.sub : messagesSub(set.messages),
            },
          ]
        : []),
      ...(set
        ? set.problems.map((p) => ({ key: p.id, label: p.label, sub: p.sub }))
        : a.symptoms.map((p) => ({ key: p.id, label: p.label, sub: p.sub }))),
    ];
  }

  const inputBar =
    step === 'geraet' || running ? undefined : (
      <ChatInput
        label={de.thread.inputLabel}
        placeholder={de.chat.placeholder}
        hint={de.chat.inputNotice}
        error={textError}
        value={text}
        onChangeText={(v) => {
          setText(v);
          setTextError(undefined);
        }}
        onSend={submitText}
        sendLabel={de.chat.send}
        canSend={!!text.trim()}
      />
    );

  return (
    <Screen
      header={header}
      footer={<QuickReplies replies={replies} onPick={onPick} footer={inputBar} />}
      scrollRef={scrollRef}
    >
      {guided ? <DemoHint id="problem" /> : null}

      {askDevice ? (
        <>
          <BotSays lines={[g.whichDevice]} />
          {device ? <UserSaid text={deviceTitle(device)} onEdit={editDevice} /> : null}
        </>
      ) : device ? (
        <BotSays lines={[g.forDevice(deviceTitle(device))]} />
      ) : null}

      {running && maintenance ? <UserSaid text={maintenance.title} /> : null}
      {running ? (
        <BotSays
          sender={askDevice}
          lines={[de.thread.runningCase(running.problemLabel)]}
          hint={canReplace ? de.thread.runningCaseAsk : de.thread.runningCaseOnlyContinue}
        />
      ) : step !== 'geraet' ? (
        <BotSays
          sender={askDevice}
          lines={[g.whatsUp]}
          hint={guided ? undefined : g.whatsUpNoGuides}
        />
      ) : null}

      {answer ? <UserSaid text={answer} onEdit={editProblem} /> : null}
      {step === 'meldung' ? <BotSays lines={[g.whichMessage]} /> : null}
    </Screen>
  );
}

/** „z. B. Wasserablauf, Waterproof, Fehler F“: die ersten drei Meldungen des Geräts */
function messagesSub(messages: { code: string }[]): string {
  return de.common.example([...new Set(messages.map((m) => m.code))].slice(0, 3).join(', '));
}
