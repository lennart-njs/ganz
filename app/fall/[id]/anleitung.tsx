import * as Haptics from 'expo-haptics';
import { usePreventRemove } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';

import { DemoHint } from '@/components/app/DemoHint';
import { CaseScreen, useCaseId } from '@/components/app/CaseScreen';
import { backToThread, leaveCase } from '@/components/nav/leaveCase';
import {
  ActionBar,
  Button,
  Checkbox,
  InfoBox,
  PhotoFrame,
  Sheet,
  StepProgress,
  Text,
  TextField,
  Toast,
} from '@/components/ds';
import { getGuide } from '@/lib/guideCatalog';
import type { GuideId } from '@/data/guides';
import { de } from '@/i18n/de';
import { appliance } from '@/lib/appliance';
import { latestGuideRun } from '@/lib/caseView';
import { getManufacturer } from '@/lib/devices';
import { guideEnding, guideTools, SAFETY_CONFIRM } from '@/lib/guideMeta';
import { useAppStore } from '@/store/appStore';

const t = de.guide;

/**
 * Anleitung: ein Schritt pro Ansicht. Zurück, Wischgeste und Android-Zurück gehen einen
 * Schritt zurück (B-05). „Geht nicht“ in jedem Schritt (B-06). Warnhinweise vor dem Text (B-51).
 */
export default function Anleitung() {
  const caseId = useCaseId();
  const state = useAppStore();
  const c = state.cases[caseId];
  const run = c ? latestGuideRun(state, c) : undefined;
  const guide = run ? getGuide(run.guideId) : undefined;
  const device = state.devices.find((d) => d.id === c?.deviceId);
  const [notWorking, setNotWorking] = useState(false);
  const [note, setNote] = useState('');
  const [toast, setToast] = useState<string>();
  const [confirmed, setConfirmed] = useState<Record<number, boolean>>({});

  const step = run?.currentStep ?? 0;
  const active = !!run && !run.endedAt;

  // Zurück aus Schritt 2 und später geht einen Schritt zurück. Andere Wege (Schließen) bleiben frei.
  // Wohin es geht, wenn die Anleitung bewusst verlassen wird: Fall schließen oder ins Gespräch
  const [leaving, setLeaving] = useState<'fall' | { entwurf: string }>();
  const toThread = useRef<string | undefined>(undefined);
  usePreventRemove(active && step > 0 && !leaving, ({ data }) => {
    const type = data.action.type;
    if (toThread.current !== undefined) {
      setLeaving({ entwurf: toThread.current });
      return;
    }
    if ((type === 'GO_BACK' || type === 'POP') && run) {
      useAppStore.getState().moveGuideStep(run.id, 'back');
      return;
    }
    // Der andere Weg aus der Anleitung ist das Verlassen des Falls (Schließen)
    setLeaving('fall');
  });
  useEffect(() => {
    if (!leaving) return;
    // Einen Tick warten, bis der Navigator die gelöste Sperre kennt, dann neu navigieren
    const timer = setTimeout(() => {
      if (leaving === 'fall') leaveCase();
      else backToThread(caseId, leaving.entwurf);
    }, 0);
    return () => clearTimeout(timer);
  }, [leaving, caseId]);

  /** Frage zum Schritt: ins Gespräch, der Schritt bleibt gespeichert */
  const askAssistant = (draft: string) => {
    toThread.current = draft;
    backToThread(caseId, draft);
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(undefined), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!c || !run || !guide || !device) {
    return (
      <CaseScreen title={de.screens.anleitung}>
        <Text variant="body">{t.missing}</Text>
      </CaseScreen>
    );
  }

  const current = guide.steps[Math.min(step, guide.steps.length - 1)]!;
  const isLast = step >= guide.steps.length - 1;
  const ending = guideEnding(guide, c);
  const manufacturer = getManufacturer(device.manufacturerId).name;
  const confirmKey = SAFETY_CONFIRM[guide.id as GuideId]?.[step];
  const needsConfirm = !!confirmKey && !confirmed[step];
  const tools = guideTools(guide);
  const s = useAppStore.getState;

  const blocked = () => setToast(t.confirmFirst(t.confirm[confirmKey!]));

  const next = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    s().moveGuideStep(run.id, 'next');
  };

  const help = (outcome: 'geht_nicht' | 'laeuft_nicht', text?: string) => {
    s().finishGuide(run.id, outcome, text);
    s().escalate(caseId);
    setNotWorking(false);
    backToThread(caseId);
  };

  const solved = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    s().finishGuide(run.id, 'laeuft_wieder');
    backToThread(caseId);
  };

  const finished = () => {
    s().finishGuide(run.id, 'fertig');
    backToThread(caseId);
  };

  let actions;
  if (isLast && ending === 'noSelf') {
    actions = (
      <Button
        label={t.getHelp}
        disabled={needsConfirm}
        onDisabledPress={blocked}
        onPress={() => help('laeuft_nicht')}
      />
    );
  } else if (isLast && ending === 'stoerung') {
    actions = (
      <>
        <Button label={t.stillBroken} variant="secondary" onPress={() => help('laeuft_nicht')} />
        <Button label={t.runsAgain} onPress={solved} />
      </>
    );
  } else {
    actions = (
      <>
        <Button label={t.notWorking} variant="secondary" onPress={() => setNotWorking(true)} />
        <Button
          label={isLast ? t.finished : t.done}
          disabled={needsConfirm}
          onDisabledPress={blocked}
          onPress={isLast ? finished : next}
        />
      </>
    );
  }

  const noSelfBar = isLast && ending === 'noSelf';

  return (
    <CaseScreen
      title={guide.title}
      footer={
        <>
          {toast ? <Toast message={toast} style={styles.toast} /> : null}
          <ActionBar
            meta={noSelfBar ? t.noSelf : de.a11y.stepOf(step + 1, guide.steps.length)}
            sub={noSelfBar ? t.noSelfSub(manufacturer) : undefined}
          >
            {actions}
          </ActionBar>
        </>
      }
    >
      <DemoHint id="anleitung" />
      <StepProgress total={guide.steps.length} current={step} />
      {current.img ? (
        <PhotoFrame
          label={
            current.src ? current.t : (t.images[current.img as keyof typeof t.images] ?? current.t)
          }
        />
      ) : null}
      {step === 0 ? (
        <Text variant="meta">{t.sourceShort(guide.sourceDocument.split(',')[0]!)}</Text>
      ) : null}
      <Text variant="h1" accessibilityRole="header">
        {current.t}
      </Text>
      {current.w ? <InfoBox tone="achtung">{current.w}</InfoBox> : null}
      <Text variant="bodyLg">{current.d}</Text>

      {/* Werkzeug: im ersten Schritt alles für die Anleitung, danach nur, was dieser Schritt braucht */}
      {step === 0 && tools.length ? (
        <Text variant="meta">{de.result.tools(tools.join(', '))}</Text>
      ) : step > 0 && current.tool ? (
        <Text variant="meta">{de.result.tools(current.tool)}</Text>
      ) : null}

      {confirmKey ? (
        <Checkbox
          label={t.confirm[confirmKey]}
          checked={!!confirmed[step]}
          onChange={(v) => {
            setConfirmed({ ...confirmed, [step]: v });
            if (v) s().confirmSafety(run.id, step);
          }}
        />
      ) : null}

      {isLast && ending === 'stoerung' ? (
        <Text variant="title" accessibilityRole="header" style={styles.question}>
          {appliance(device?.category).runsAgain}
        </Text>
      ) : null}

      <Button
        label={de.chat.askStep}
        variant="link"
        onPress={() => askAssistant(de.chat.stepDraft(step + 1, current.t))}
      />

      <Sheet visible={notWorking} onClose={() => setNotWorking(false)} title={t.notWorkingTitle}>
        <TextField
          label={t.noteLabel}
          placeholder={t.notePlaceholder}
          multiline
          rows={3}
          value={note}
          onChangeText={setNote}
        />
        <Button label={t.getHelp} size="lg" fullWidth onPress={() => help('geht_nicht', note)} />
      </Sheet>
    </CaseScreen>
  );
}

const styles = StyleSheet.create({
  tool: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
  },
  toolText: { flex: 1 },
  question: { marginTop: 8 },
  toast: { marginHorizontal: 16, marginBottom: 8 },
});
