import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { KeyboardAwareScrollViewRef } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CallbackSheet } from '@/components/app/CallbackSheet';
import { CaseFileCard } from '@/components/app/CaseFileCard';
import { CaseScreen, useCaseId } from '@/components/app/CaseScreen';
import { BotSays, QuickReplies, Typing, UserSaid, type Reply } from '@/components/app/Conversation';
import { CostCompare } from '@/components/app/CostCompare';
import { DemoHint } from '@/components/app/DemoHint';
import { ScopeItems } from '@/components/app/ScopeItems';
import { leaveCase } from '@/components/nav/leaveCase';
import {
  Button,
  Card,
  Checkbox,
  ConfidenceLabel,
  Disclosure,
  FactList,
  InfoBox,
  PhotoFrame,
  StarRating,
  Text,
  TextField,
  Toast,
} from '@/components/ds';
import { demoConfig } from '@/config/demo.config';
import { guides, type GuideId } from '@/data/guides';
import { useCommand } from '@/hooks/useCommand';
import { useNotice } from '@/hooks/useNotice';
import { de } from '@/i18n/de';
import { formatDecimal, formatEuro } from '@/i18n/format';
import { caseAppliance, hasGuides } from '@/lib/appliance';
import { amountToPay, costsLine, requestAppointment } from '@/lib/booking';
import { chatLimits } from '@/lib/chat/limits';
import { scopeList } from '@/lib/consent';
import { textStamp } from '@/lib/legalTexts';
import { retryableChatErrors, useAssistant } from '@/lib/chat/useAssistant';
import { deviceTitle, getManufacturer } from '@/lib/devices';
import { guideTools } from '@/lib/guideMeta';
import { openPhone } from '@/lib/linking';
import { toDiagnosis } from '@/lib/diagnosis';
import { can } from '@/model/policies/actions';
import { selectCaseFacts } from '@/model/policies/caseFacts';
import { CONSENT_SCOPES, scopedConsent } from '@/model/policies/consentScopes';
import { hasProgress } from '@/model/policies/openCase';
import type { CaseEvent, Diagnosis } from '@/model/types';
import { services, type FindingOption, type PhotoMode, type QuestionAnswer } from '@/services';
import {
  nextSimulationDue,
  selectCaseEvents,
  useAppStore,
  type NewConsent,
} from '@/store/appStore';
import { useTheme } from '@/theme';

const t = de.thread;

interface Item {
  at: string;
  key: string;
  node: ReactNode;
}

const answers: QuestionAnswer[] = ['ablauf', 'zulauf', 'unklar'];

/**
 * Der Fall als ein Gespräch (Entscheidung 11). Alles, was im Fall passiert, steht als Nachricht
 * im Verlauf: Ergebnis, Anleitung, Hilfe, Befund, Kosten, Termin und Status. Kamera, Anleitung
 * und Videocall öffnen sich als Vollbild und kehren hierher zurück. „Details“ zeigt die Formulare.
 * Der Verlauf entsteht aus dem gespeicherten Fall, er übersteht also jeden Neustart.
 */
export default function FallGespraech() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const caseId = useCaseId();
  const params = useLocalSearchParams<{ weiter?: string; frage?: string; entwurf?: string }>();
  const state = useAppStore();
  const c = state.cases[caseId];
  const assistant = useAssistant(caseId);
  const scrollRef = useRef<KeyboardAwareScrollViewRef>(null);

  // Wahl im laufenden Gespräch, bevor sie gespeichert wird
  const [screenshots, setScreenshots] = useState(false);
  const [payment, setPayment] = useState<'selbst' | undefined>();
  const [onSite, setOnSite] = useState(false);
  const [partnerId, setPartnerId] = useState<string>();
  const [slot, setSlot] = useState<string>();
  /** Zeitfenster für den Rückruf, bis die Weitergabe bestätigt ist */
  const [callbackSlot, setCallbackSlot] = useState<string>();
  const [input, setInput] = useState('');
  const [inputError, setInputError] = useState<string>();

  // Buttons, die nur einmal zählen: Ein Doppeltap löst nichts doppelt aus, eine Ablehnung bekommt
  // einen ruhigen Satz (hooks/useCommand.ts)
  const call = useCommand(
    (confirm: { share: NewConsent; screenshots?: NewConsent }) =>
      useAppStore.getState().requestVideoCall(caseId, confirm),
    (session) => router.push(`/fall/${caseId}/warteraum?video=${session.id}`),
  );
  const claim = useCommand(
    () => useAppStore.getState().reportClaim(caseId),
    () => setPayment(undefined),
  );
  const book = useCommand(requestAppointment, () => {
    setPartnerId(undefined);
    setSlot(undefined);
    setPayment(undefined);
    setOnSite(false);
  });
  // Lässt sich die Telefon-App nicht öffnen, steht die Nummer im Hinweis
  const phoneNotice = useNotice();
  const commandToast = call.toast ?? claim.toast ?? book.toast ?? phoneNotice.notice;

  // Ein Fall ohne Inhalt bleibt nicht liegen, wenn man das Gespräch verlässt
  useEffect(() => () => useAppStore.getState().discardIfEmpty(caseId), [caseId]);

  // Aus „Problem melden“: gleich weiter in die Anleitung, zur Kamera oder mit der ersten Frage
  const started = useRef(false);
  useEffect(() => {
    if (started.current || !c) return;
    started.current = true;
    const weiter = params.weiter;
    const frage = params.frage;
    if (frage) assistant.send(frage);
    const go = () => {
      if (weiter || frage) router.setParams({ weiter: undefined, frage: undefined });
      if (weiter === 'anleitung') router.push(`/fall/${caseId}/anleitung`);
      else if (weiter === 'kamera') router.push(`/fall/${caseId}/kamera`);
    };
    // Beim Kaltstart direkt in den Fall ist der Router erst nach dem ersten Rendern bereit
    try {
      go();
    } catch {
      setTimeout(go, 0);
    }
    // Nur beim ersten Öffnen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c?.id]);

  // Frage zu einem Anleitungsschritt: Entwurf ins Eingabefeld (Zustand beim Rendern anpassen)
  const [draft, setDraft] = useState<string>();
  if (params.entwurf && params.entwurf !== draft) {
    setDraft(params.entwurf);
    setInput(params.entwurf);
  }

  const events = c ? selectCaseEvents(state, caseId) : [];
  const last = events.at(-1)?.id;
  const msgs = state.chatMessages.filter((m) => m.caseId === caseId);
  useEffect(() => {
    const id = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(id);
  }, [
    last,
    msgs.length,
    assistant.pending,
    assistant.waiting,
    assistant.error,
    payment,
    onSite,
    partnerId,
    slot,
  ]);

  if (!c) {
    return (
      <CaseScreen title={de.screens.status}>
        <Text variant="body">{de.result.missing}</Text>
      </CaseScreen>
    );
  }

  // Was im Fall gilt, sagen die Fakten und Regeln (model/policies), nicht ein Vergleich des Status
  const facts = selectCaseFacts(state, caseId)!;
  // „Selbst zahlen“ gilt nur, wo der Haushalt wirklich zahlt. Ist der Schadenfall inzwischen
  // gemeldet, zählt die Wahl nicht mehr: kein „Du zahlst …“ während der Prüfung (R-07).
  const selfPay = payment === 'selbst' && can(facts, 'termin_selbst');
  const device = state.devices.find((d) => d.id === c.deviceId);
  const contract = state.contracts.find((k) => k.id === device?.contractId);
  const a = caseAppliance(state, caseId);
  const insurer = demoConfig.insurer.shortName;
  const expert = demoConfig.expert.name;
  const manufacturer = device ? getManufacturer(device.manufacturerId).name : '';
  const service = device ? getManufacturer(device.manufacturerId).serviceContact : undefined;
  const helpPartner = demoConfig.partners.find((p) => p.id === demoConfig.expert.partnerId)!;
  const diagnoses = c.diagnosisIds
    .map((id) => state.diagnoses.find((d) => d.id === id))
    .filter((d): d is Diagnosis => !!d);
  const runs = c.guideRunIds.map((id) => state.guideRuns[id]).filter((r) => !!r);
  const run = runs.at(-1);
  const sessions = state.videoSessions.filter((v) => v.caseId === caseId);
  const quote = state.quotes.find((q) => q.id === c.quoteId);
  const bookings = state.bookings.filter((b) => b.caseId === caseId);
  const booking = facts.booking;
  const repairBooking = facts.bookings.reparatur;
  const progress = hasProgress(state, c);
  const of = (type: CaseEvent['type']) => events.filter((e) => e.type === type);
  const after = (
    iso: string | undefined,
    type: CaseEvent['type'],
    pred?: (e: CaseEvent) => boolean,
  ) => events.some((e) => e.type === type && (!iso || e.at >= iso) && (!pred || pred(e)));

  // ---------- Aktionen ----------

  const editProblem = progress
    ? undefined
    : () => router.replace({ pathname: '/fall/neu', params: { fall: caseId } });

  const escalate = () => useAppStore.getState().escalate(caseId);

  // Der Tap bestätigt die Weitergabe an die Fachkraft. Der Store speichert sie mit dem Call.
  // Umfang und Rechtsgrundlage kommen aus CONSENT_SCOPES, wie in der Liste darüber (R-14).
  const startCall = () => {
    const recipient = { id: helpPartner.id, kind: 'betrieb' as const, name: helpPartner.name };
    call.run({
      share: scopedConsent('weitergabe_fachkraft', {
        caseId,
        recipient,
        text: textStamp('fachkraft_videocall'),
      }),
      screenshots: screenshots
        ? scopedConsent('screenshots_im_call', {
            caseId,
            recipient,
            text: textStamp('screenshots'),
          })
        : undefined,
    });
  };

  // Läuft dieselbe Anleitung schon, geht startGuide dort weiter (R-06)
  const openGuide = (guideId: string) => {
    const s = useAppStore.getState();
    if (!c.guideRunIds.length && c.entry === 'freitext') {
      s.updateCase(caseId, { problemLabel: guides[guideId as GuideId].title });
    }
    s.startGuide(caseId, guideId);
    router.push(`/fall/${caseId}/anleitung`);
  };

  const answerQuestion = (answer: QuestionAnswer, question: CaseEvent) => {
    const s = useAppStore.getState();
    s.addEvent({
      caseId,
      type: 'rueckfrage_beantwortet',
      actor: { kind: 'haushalt', id: s.persons[0]?.id },
      payload: { question: de.question.wasser, answer: de.question.answers[answer] },
    });
    const finding = services.diagnosis.answer(answer);
    if (!finding) {
      escalate();
      return;
    }
    s.updateCase(caseId, { problemLabel: guides[finding.guideId as GuideId].title });
    const photoId = question.payload.photoId as string | undefined;
    s.addDiagnosis(
      toDiagnosis(caseId, photoId ? [photoId] : [], question.payload.mode as PhotoMode, finding),
    );
  };

  const confirmFinding = (option: FindingOption) =>
    useAppStore.getState().setFinding(caseId, option, 'fachkraft');

  const declineFinding = () => {
    const s = useAppStore.getState();
    s.addEvent({
      caseId,
      type: 'rueckfrage_beantwortet',
      actor: { kind: 'haushalt', id: s.persons[0]?.id },
      payload: { question: t.findingQuestion, answer: t.findingWrongAnswer },
    });
  };

  const report = claim.run;

  const request = () => {
    if (!partnerId || !slot) return;
    book.run({ caseId, partnerId, slot, selfPay, diagnosis: onSite });
  };

  const sendInput = () => {
    const text = input.trim();
    if (!text) return;
    if (text.length > chatLimits.chars) {
      setInputError(de.chat.tooLong(chatLimits.chars));
      return;
    }
    setInput('');
    assistant.send(text);
  };

  // ---------- Verlauf ----------

  const items: Item[] = [];
  const add = (at: string, key: string, node: ReactNode) => items.push({ at, key, node });
  const details = (path: string) => (
    <Button
      label={t.details}
      variant="link"
      onPress={() => router.push(`/fall/${caseId}/${path}`)}
    />
  );

  // Gerät und Problem
  add(
    c.createdAt,
    'intro',
    <BotSays
      lines={[
        ...(device ? [de.talk.problem.forDevice(deviceTitle(device))] : []),
        de.talk.problem.whatsUp,
      ]}
    />,
  );
  if (c.entry === 'foto')
    add(c.createdAt, 'entry', <UserSaid text={de.problem.photo} onEdit={editProblem} />);
  if (c.entry === 'symptom' || c.entry === 'pflege') {
    add(c.createdAt, 'entry', <UserSaid text={c.problemLabel} onEdit={editProblem} />);
  }
  if (c.entry === 'meldung') {
    add(c.createdAt, 'entry', <UserSaid text={de.problems[0]!.label} onEdit={editProblem} />);
    add(c.createdAt, 'entry-q', <BotSays lines={[de.talk.problem.whichMessage]} />);
    add(c.createdAt, 'entry-a', <UserSaid text={c.problemLabel} />);
  }

  // Fotos
  for (const e of of('foto_aufgenommen')) {
    const purpose = e.payload.purpose as keyof typeof de.caseFile.photoPurpose;
    if (purpose === 'abschluss' || purpose === 'schritt') continue;
    add(e.at, e.id, <UserSaid text={t.photo(de.caseFile.photoPurpose[purpose] ?? '')} />);
  }

  // Rückfragen und Antworten
  for (const e of of('rueckfrage_gestellt')) {
    add(e.at, e.id, <BotSays lines={[de.question.wasser]} hint={de.question.text} />);
  }
  for (const e of of('rueckfrage_beantwortet')) {
    const q = String(e.payload.question);
    if (q === de.question.wasser) add(e.at, e.id, <UserSaid text={String(e.payload.answer)} />);
    if (q === de.problem.otherTitle) add(e.at, e.id, <UserSaid text={String(e.payload.answer)} />);
    if (q === t.findingQuestion) {
      add(e.at, e.id, <UserSaid text={t.findingWrongAnswer} />);
      add(e.at, `${e.id}-a`, <BotSays lines={[t.findingWrongText]} />);
    }
  }

  // Ergebnis der Intelligenten Fehlererkennung
  for (const d of diagnoses) {
    if (d.source !== 'fehlererkennung') continue;
    if (d.errorPattern === 'geraet_erkannt') {
      add(
        d.createdAt,
        d.id,
        <BotSays lines={[de.result.deviceTitle]} hint={de.result.deviceText} />,
      );
      continue;
    }
    if (d.errorPattern === 'ohne_anleitung') {
      add(
        d.createdAt,
        d.id,
        <BotSays lines={[de.result.noGuideTitle]} hint={de.result.noGuideText} />,
      );
      continue;
    }
    const pattern = d.errorPattern as keyof typeof de.result.headline;
    add(
      d.createdAt,
      d.id,
      <BotSays lines={[de.result.headline[pattern] ?? '']} hint={de.result.selfHelp}>
        <View style={styles.full}>
          <Card>
            <FactList
              ruled
              items={[
                ...(d.displayMessage
                  ? [
                      [de.result.facts.message, de.result.quoted(d.displayMessage)] as [
                        string,
                        string,
                      ],
                    ]
                  : []),
                [de.result.facts.component, d.component ?? ''],
                [de.result.facts.damage, d.visibleDamage ?? de.result.noDamage],
              ]}
            />
            <View style={styles.gapTop}>
              <ConfidenceLabel level={d.confidence} />
            </View>
          </Card>
        </View>
        {d.guideId ? (
          <InfoBox>
            {contract
              ? de.result.costNote(insurer, formatEuro(state.demo.deductible))
              : de.result.costNoteNoContract}
          </InfoBox>
        ) : null}
        {details('ergebnis')}
      </BotSays>,
    );
  }

  // Anleitungen. Eine, die ohne Schritt endete, weil du ein anderes Problem gewählt hast, ist
  // kein Angebot mehr. Sie steht nur in der Fallakte.
  for (const r of runs) {
    const guide = guides[r.guideId as GuideId];
    if (!guide) continue;
    if (r.endedAt && !r.outcome && !r.completedSteps.length) continue;
    const tools = guideTools(guide);
    add(
      r.startedAt,
      r.id,
      <BotSays
        lines={[
          t.guideOffer(
            guide.title,
            de.result.stepsCount(guide.steps.length),
            de.result.source(manufacturer),
          ),
        ]}
        hint={tools.length ? de.result.tools(tools.join(', ')) : de.result.noTools}
      />,
    );
    if (!r.endedAt) continue;
    const step = (r.abortedAtStep ?? r.currentStep) + 1;
    const outcome =
      r.outcome === 'geht_nicht'
        ? t.outcome.geht_nicht(step, guide.steps[step - 1]?.t ?? '')
        : r.outcome
          ? t.outcome[r.outcome]
          : '';
    if (outcome) add(r.endedAt, `${r.id}-end`, <UserSaid text={outcome} />);
    if (r.abortNote)
      add(r.endedAt, `${r.id}-note`, <UserSaid text={de.file.event.note(r.abortNote)} />);
    if (r.outcome === 'laeuft_wieder') {
      add(
        r.endedAt,
        `${r.id}-ok`,
        <BotSays lines={[de.finish.solvedTitle]} hint={de.finish.solvedText} />,
      );
    }
    if (r.outcome === 'fertig') {
      add(r.endedAt, `${r.id}-ok`, <BotSays lines={[de.status.headline.erledigt]} />);
    }
  }

  // Hilfe holen
  for (const e of of('status_geaendert')) {
    if (e.payload.to !== 'eskaliert') continue;
    add(e.at, e.id, <BotSays lines={[t.helpIntro]} hint={t.helpText} />);
  }
  for (const e of of('problem_besteht_weiter')) {
    add(e.at, e.id, <UserSaid text={t.stillBroken} />);
  }

  // Videocall und Rückruf
  for (const e of of('videocall_angefragt')) {
    if (e.payload.art === 'rueckruf') {
      add(e.at, e.id, <UserSaid text={String(e.payload.slot)} />);
      add(e.at, `${e.id}-a`, <BotSays lines={[t.callbackDone(String(e.payload.slot))]} />);
    } else {
      add(e.at, e.id, <UserSaid text={t.callStart} />);
    }
  }
  for (const v of sessions) {
    if (!v.endedAt) continue;
    if (v.outcome === 'keine_fachkraft') {
      add(
        v.endedAt,
        v.id,
        <BotSays lines={[de.waiting.noExpertTitle]} hint={de.waiting.noExpertText} />,
      );
    } else if (v.outcome === 'abgebrochen') {
      add(v.endedAt, v.id, <BotSays lines={[t.callAborted]} />);
    } else {
      add(v.endedAt, v.id, <BotSays lines={[t.callEnded(v.expert.name)]} />);
    }
  }

  // Befund
  const findingLines = (option: FindingOption): { lines: string[]; hint?: string } =>
    option === 'reparatur'
      ? { lines: [a.finding.title], hint: a.finding.text }
      : option === 'geloest'
        ? { lines: [de.finding.options.geloest], hint: a.finding.solved }
        : { lines: [de.finding.options.ersatzgeraet], hint: de.finding.optionSubs.ersatzgeraet };
  for (const e of of('befund_erstellt')) {
    const option = e.payload.option as FindingOption;
    const f = findingLines(option);
    const byExpert = e.actor.kind === 'fachkraft';
    add(
      e.at,
      e.id,
      <BotSays
        name={byExpert ? t.findingFrom(e.actor.name ?? expert) : (e.actor.name ?? de.app.name)}
        lines={f.lines}
        hint={f.hint}
      />,
    );
    if (byExpert) add(e.at, `${e.id}-ok`, <UserSaid text={t.findingOk} />);
    if (option === 'geloest') add(e.at, `${e.id}-done`, <BotSays lines={[t.solvedInCall]} />);
  }

  // Kosten und Schadenmeldung
  if (quote) {
    const finding = diagnoses.findLast((d) => d.source === 'fachkraft' || d.source === 'betrieb');
    const replacement = finding?.errorPattern === 'ersatzgeraet_noetig';
    add(
      quote.createdAt,
      quote.id,
      <BotSays
        lines={[
          ...(finding?.component ? [de.talk.claim.intro(finding.component)] : []),
          replacement ? de.costs.titleReplacement : de.costs.title,
        ]}
      >
        <View style={styles.full}>
          <CostCompare quote={quote} focus={replacement ? 'replacement' : 'repair'} />
        </View>
        {details('kosten')}
      </BotSays>,
    );
    if (c.claim) {
      add(c.claim.reportedAt, 'claim', <UserSaid text={de.costs.report} />);
      add(
        c.claim.reportedAt,
        'claim-a',
        <BotSays
          lines={[replacement ? t.replacementNext(insurer) : de.talk.claim.reported(insurer)]}
        />,
      );
    }
  }

  // Termine und was danach passiert
  for (const e of of('termin_angefragt')) {
    const b = bookings.find((x) => x.id === e.payload.bookingId) ?? booking;
    if (!b) continue;
    add(e.at, e.id, <UserSaid text={t.bookingAnswer(b.slotLabel, b.provider.name)} />);
    add(
      e.at,
      `${e.id}-a`,
      <BotSays
        lines={[de.status.headline.angefragt]}
        hint={de.status.text.angefragt(b.provider.name)}
      >
        {details('status')}
      </BotSays>,
    );
  }
  for (const e of of('freigabe_entschieden')) {
    const ok = e.payload.result === 'freigegeben';
    add(
      e.at,
      e.id,
      <BotSays
        lines={[
          ok ? de.status.headline.freigegeben(insurer) : de.status.headline.abgelehnt(insurer),
        ]}
        hint={ok ? undefined : de.costs.rejectedText}
      />,
    );
  }
  for (const e of of('termin_bestaetigt')) {
    const b = bookings.find((x) => x.id === e.payload.bookingId) ?? booking;
    if (!b) continue;
    add(
      e.at,
      e.id,
      <BotSays
        lines={[de.status.headline.bestaetigt(b.slotLabel)]}
        hint={
          b.kind === 'reparatur'
            ? de.status.text.bestaetigt(b.provider.name, a.finding.partAcc)
            : undefined
        }
      />,
    );
  }
  for (const e of of('betrieb_unterwegs')) {
    const b = bookings.find((x) => x.id === e.payload.bookingId) ?? booking;
    add(
      e.at,
      e.id,
      <BotSays lines={[de.status.headline.unterwegs(b?.provider.name ?? '')]} hint={a.reachable} />,
    );
  }
  for (const e of of('angebot_erstellt')) {
    // Nur der Kostenvoranschlag nach der Vor-Ort-Diagnose ist eine eigene Nachricht
    if (e.actor.kind !== 'betrieb') continue;
    add(
      e.at,
      e.id,
      <BotSays lines={[de.status.headline.diagnoseFertig]} hint={de.status.text.diagnoseFertig} />,
    );
  }
  for (const e of of('reparatur_abgeschlossen')) {
    const b = bookings.find((x) => x.id === e.payload.bookingId) ?? booking;
    add(
      e.at,
      e.id,
      <BotSays lines={[de.finish.repairedTitle]} hint={a.finding.repaired(b?.provider.name ?? '')}>
        <View style={styles.full}>
          <PhotoFrame label={de.finish.photo} />
        </View>
        <Text variant="title">{a.runsAgain}</Text>
      </BotSays>,
    );
  }
  for (const e of of('abschluss_bestaetigt')) {
    add(e.at, e.id, <UserSaid text={de.finish.runsAgain} />);
    const rated = repairBooking?.rating?.stars;
    add(
      e.at,
      `${e.id}-a`,
      <BotSays lines={[de.finish.solvedTitle]}>
        {repairBooking && can(facts, 'bewerten') ? (
          <>
            <Text variant="title">{t.rate}</Text>
            <StarRating
              value={rated ?? 0}
              onChange={(n) =>
                useAppStore.getState().rateBooking(repairBooking.id, n as 1 | 2 | 3 | 4 | 5)
              }
            />
            {rated ? <Text variant="body">{de.finish.thanks}</Text> : null}
          </>
        ) : null}
      </BotSays>,
    );
  }
  for (const e of of('abgebrochen')) {
    add(
      e.at,
      e.id,
      <BotSays
        lines={[t.cancelled]}
        hint={e.payload.reason ? String(e.payload.reason) : undefined}
      />,
    );
  }

  // Gespräch mit dem Reparatur-Assistenten
  msgs.forEach((m, i) =>
    add(
      m.at,
      m.id,
      m.role === 'haushalt' ? (
        <UserSaid text={m.text} />
      ) : (
        <BotSays name={de.chat.title} sender={msgs[i - 1]?.role !== 'assistent'} lines={[m.text]} />
      ),
    ),
  );

  // Stabil nach Zeit sortieren: gleiche Zeit behält die Reihenfolge oben
  const ordered = items
    .map((x, i) => ({ ...x, i }))
    .sort((x, y) => (x.at === y.at ? x.i - y.i : x.at.localeCompare(y.at)));

  // ---------- Was jetzt dran ist ----------

  const tail: ReactNode[] = [];
  const replies: Reply[] = [];
  const handlers: Record<string, () => void> = {};
  const reply = (key: string, label: string, onPick: () => void, sub?: string) => {
    replies.push({ key, label, sub });
    handlers[key] = onPick;
  };

  const lastSession = sessions.at(-1);
  const pendingQuestion = (() => {
    const asked = of('rueckfrage_gestellt').at(-1);
    if (!asked) return undefined;
    const answered = after(
      asked.at,
      'rueckfrage_beantwortet',
      (e) => e.payload.question === de.question.wasser,
    );
    return answered ? undefined : asked;
  })();
  const callEnded = lastSession?.endedAt && lastSession.outcome === 'verbunden';
  const findingPending =
    callEnded &&
    !after(lastSession.endedAt, 'befund_erstellt') &&
    !after(
      lastSession.endedAt,
      'rueckfrage_beantwortet',
      (e) => e.payload.question === t.findingQuestion,
    );
  const noExpert =
    lastSession?.outcome === 'keine_fachkraft' &&
    !after(lastSession.endedAt, 'videocall_angefragt', (e) => e.payload.art === 'rueckruf') &&
    !booking;
  const awaitingConfirm = can(facts, 'reparatur_bestaetigen');
  const latestFinding = diagnoses.findLast(
    (d) => d.source === 'fachkraft' || d.source === 'betrieb',
  );
  const replacement = latestFinding?.errorPattern === 'ersatzgeraet_noetig';
  const costsOpen =
    !repairBooking &&
    !selfPay &&
    !replacement &&
    (can(facts, 'schaden_melden') || can(facts, 'selbst_zahlen'));
  // Nach einer Ablehnung: selbst zahlen heißt neuer Termin, der alte Antrag zählt nicht mehr
  const rejected = can(facts, 'selbst_zahlen_nach_ablehnung');
  const rejectedRetry = rejected && selfPay;
  const lastCallback = of('videocall_angefragt')
    .filter((e) => e.payload.art === 'rueckruf')
    .at(-1);
  const callbackWaiting =
    !!lastCallback &&
    can(facts, 'videocall_anfragen') &&
    !booking &&
    !onSite &&
    (!lastSession || lastCallback.at >= (lastSession.endedAt ?? lastSession.requestedAt));
  const needsAppointment =
    rejectedRetry ||
    (!repairBooking && (can(facts, 'termin_versicherer') || selfPay || (onSite && !booking)));
  const demoTap =
    demoConfig.demo.enabled && state.demo.hints && nextSimulationDue(state, caseId) !== undefined;

  // Vorschlag des Assistenten zuerst
  const lastMsg = msgs.at(-1);
  const canGuide = can(facts, 'anleitung_starten');
  const canHelp = can(facts, 'hilfe_holen');
  if (!assistant.pending && lastMsg?.role === 'assistent') {
    const sameGuideRunning = run && !run.endedAt && run.guideId === lastMsg.guideId;
    if (
      lastMsg.suggestion === 'anleitung' &&
      canGuide &&
      !sameGuideRunning &&
      lastMsg.guideId &&
      lastMsg.guideId in guides
    ) {
      const g = guides[lastMsg.guideId as GuideId];
      reply('vorschlag-anleitung', de.chat.startGuide(g.title), () => openGuide(g.id));
    }
    if (lastMsg.suggestion === 'hilfe' && canHelp) {
      reply('vorschlag-hilfe', de.chat.getHelp, escalate);
    }
  }

  if (assistant.waiting) {
    // Einwilligung vor der ersten Nachricht an den Assistenten
    tail.push(
      <View key="consent" style={styles.stack}>
        <UserSaid text={assistant.waiting} />
        <BotSays name={de.chat.title} lines={[de.chat.consentTitle]}>
          <Text variant="bodyLg">{de.chat.consentText(demoConfig.assistant.name)}</Text>
          <ScopeItems purpose="chat_assistent" />
          <Text variant="body">{de.chat.consentExcluded}</Text>
          <Text variant="meta">{de.chat.consentBasis}</Text>
        </BotSays>
      </View>,
    );
    reply('einverstanden', de.chat.consentAccept, assistant.accept);
    reply('ablehnen', de.chat.consentDecline, () => {
      assistant.decline();
      escalate();
    });
  } else if (facts.closed && !can(facts, 'problem_besteht_weiter')) {
    // Abgebrochen
    reply('fallakte', t.caseFile, () => router.push(`/fall/${caseId}/fallakte`));
    reply('fertig', t.done, leaveCase);
  } else if (facts.closed) {
    // Erledigt, lässt sich wieder öffnen
    reply('fertig', t.done, () => router.dismissTo('/(tabs)/faelle'));
    reply('weiter-kaputt', t.stillBroken, () =>
      useAppStore.getState().confirmRepair(caseId, false),
    );
    reply('fallakte', t.caseFile, () => router.push(`/fall/${caseId}/fallakte`));
  } else if (awaitingConfirm) {
    reply('laeuft', de.finish.runsAgain, () => useAppStore.getState().confirmRepair(caseId, true));
    reply('weiter-kaputt', t.stillBroken, () =>
      useAppStore.getState().confirmRepair(caseId, false),
    );
  } else if (pendingQuestion) {
    for (const x of answers) {
      reply(`antwort-${x}`, de.question.answers[x], () => answerQuestion(x, pendingQuestion));
    }
  } else if (findingPending) {
    const option = services.video.finding();
    const f = findingLines(option);
    tail.push(
      <BotSays
        key="befund"
        name={t.findingFrom(lastSession.expert.name)}
        lines={f.lines}
        hint={f.hint}
      >
        <Text variant="meta">{t.findingRecommended(de.finding.options[option])}</Text>
      </BotSays>,
    );
    reply('befund-ok', t.findingOk, () => confirmFinding(option));
    reply('befund-nein', t.findingWrong, declineFinding);
  } else if (noExpert) {
    tail.push(<BotSays key="rueckruf" lines={[t.callbackAsk]} />);
    // Erst bestätigen, wer welche Daten sieht, dann der Rückruf (R-16)
    for (const s of de.waiting.callbackSlots) {
      reply(`rueckruf-${s}`, s, () => setCallbackSlot(s));
    }
    reply('vor-ort', de.waiting.onSiteInstead, () => setOnSite(true));
  } else if (rejected && !selfPay) {
    reply('selbst', t.rejectedChoice.selfPay(formatEuro(quote?.repair.total ?? 0)), () =>
      setPayment('selbst'),
    );
    reply('behalten', t.rejectedChoice.keep, leaveCase);
    if (can(facts, 'abbrechen')) {
      reply('schliessen', t.rejectedChoice.close, () => {
        useAppStore
          .getState()
          .runCommand(caseId, 'abbrechen', { cancelReason: de.costs.closeReason });
      });
    }
  } else if (costsOpen) {
    if (contract) {
      tail.push(
        <BotSays key="kosten" sender={false} lines={[]}>
          <Text variant="bodyLg">
            {de.talk.claim.payer(insurer, formatEuro(state.demo.deductible))}
          </Text>
          <Text variant="bodyLg">{de.talk.claim.rejected(insurer)}</Text>
          {/* Was beim Versicherer ankommt (B-53) */}
          <View style={styles.full}>
            <Disclosure title={de.costs.preview(insurer)}>
              <CaseFileCard
                caseId={caseId}
                categories={CONSENT_SCOPES.weitergabe_versicherer.dataCategories}
              />
            </Disclosure>
          </View>
          <Text variant="meta">{de.costs.legal(insurer)}</Text>
          <Text variant="title">{de.talk.claim.ask(insurer)}</Text>
        </BotSays>,
      );
      // Der Schadenfall entsteht genau hier, durch den Tap (B-17)
      reply('melden', de.costs.report, report);
      reply('selbst', de.costs.selfPay, () => setPayment('selbst'));
    } else {
      tail.push(
        <BotSays key="kosten" sender={false} lines={[]}>
          <Text variant="bodyLg">{de.costs.noContractText}</Text>
          <Text variant="title">{de.talk.claim.askNoContract}</Text>
        </BotSays>,
      );
      reply('selbst', de.costs.toAppointment, () => setPayment('selbst'));
    }
  } else if (replacement && can(facts, 'schaden_melden')) {
    reply('melden', de.costs.report, report);
  } else if (needsAppointment) {
    if (selfPay && quote) {
      tail.push(
        <View key="zahlung" style={styles.stack}>
          <UserSaid
            text={
              rejected
                ? t.rejectedChoice.selfPay(formatEuro(quote.repair.total))
                : contract
                  ? de.costs.selfPay
                  : de.costs.toAppointment
            }
            onEdit={() => setPayment(undefined)}
          />
          <BotSays lines={[de.talk.claim.selfPay(formatEuro(quote.repair.total))]} />
        </View>,
      );
    }
    if (onSite)
      tail.push(<UserSaid key="vorort" text={t.onSite} onEdit={() => setOnSite(false)} />);
    const partner = demoConfig.partners.find((p) => p.id === partnerId);
    tail.push(<BotSays key="wer" lines={[onSite ? t.diagnosisAsk : de.appointment.titleRepair]} />);
    if (!partner) {
      for (const p of demoConfig.partners) {
        reply(
          `betrieb-${p.id}`,
          p.name,
          () => setPartnerId(p.id),
          de.common.dot(
            p.authorized ? de.partner.authorized(manufacturer) : de.partner.independent,
            de.partner.distance(formatDecimal(p.distanceKm)),
          ),
        );
      }
    } else {
      tail.push(
        <UserSaid
          key="betrieb"
          text={partner.name}
          onEdit={() => {
            setPartnerId(undefined);
            setSlot(undefined);
          }}
        />,
      );
      tail.push(<BotSays key="wann" lines={[de.appointment.when]} />);
      if (!slot) {
        for (const s of demoConfig.slots) reply(`zeit-${s}`, s, () => setSlot(s));
      } else {
        const address = state.household?.address;
        tail.push(<UserSaid key="zeit" text={slot} onEdit={() => setSlot(undefined)} />);
        tail.push(
          <BotSays key="zusammenfassung" lines={[de.talk.claim.summary]}>
            <View style={styles.full}>
              <Card>
                <FactList
                  ruled
                  items={[
                    [de.appointment.facts.partner, partner.name],
                    [de.appointment.facts.slot, slot],
                    [
                      de.appointment.facts.address,
                      address
                        ? de.appointment.addressLine(address.street, address.zip, address.city)
                        : '',
                    ],
                    [
                      de.appointment.facts.job,
                      onSite
                        ? de.appointment.jobDiagnosis
                        : de.appointment.jobRepair(quote?.repair.partName ?? ''),
                    ],
                    [de.appointment.facts.costs, costsLine(state, caseId, selfPay, onSite)],
                  ]}
                />
              </Card>
            </View>
            {facts.claim === 'in_pruefung' ? <InfoBox>{de.appointment.pending}</InfoBox> : null}
            {!onSite ? (
              <Text variant="body">
                {de.appointment.ecoDesign(a.finding.partAcc, demoConfig.ecoDesignDeliveryDays)}
              </Text>
            ) : null}
            <Text variant="meta">{de.appointment.shares(scopeList('weitergabe_betrieb'))}</Text>
          </BotSays>,
        );
        const paid = amountToPay(state, caseId, selfPay, onSite) > 0;
        reply('anfragen', paid ? de.appointment.requestPaid : de.appointment.request, request);
      }
    }
  } else if (callbackWaiting) {
    // Rückruf angefragt: Die Fachkraft meldet sich. Vor Ort geht immer noch.
    reply('vor-ort', de.waiting.onSiteInstead, () => setOnSite(true));
    reply('fallakte', t.caseFile, () => router.push(`/fall/${caseId}/fallakte`));
  } else if (facts.bookingOpen) {
    // Widerrufene Weitergabe: Versicherer und Betrieb machen nicht weiter (R-12)
    const held = !!facts.hold;
    if (facts.claim === 'in_pruefung')
      tail.push(
        <BotSays
          key="pruefung"
          lines={[de.status.headline.pruefung(insurer)]}
          hint={held ? de.status.text.paused : de.status.text.pruefung}
        />,
      );
    else if (held) tail.push(<BotSays key="angehalten" lines={[de.status.text.paused]} />);
    if (demoTap) reply('demo', t.demoNext, () => useAppStore.getState().simulateNext(caseId));
    reply('status', de.status.caseFile, () => router.push(`/fall/${caseId}/fallakte`));
  } else if (can(facts, 'videocall_anfragen')) {
    // Hilfe holen: wer welche Daten sieht, steht vor dem Call (B-19)
    tail.push(
      <BotSays key="hilfe" sender={false} lines={[]}>
        {/* Was die Fachkraft vorab sieht: das echte Protokoll (B-22) */}
        <View style={styles.full}>
          <CaseFileCard
            caseId={caseId}
            categories={CONSENT_SCOPES.weitergabe_fachkraft.dataCategories}
          />
        </View>
        <View style={styles.full}>
          <Card>
            <Text variant="labelStrong" accessibilityRole="header">
              {de.help.shareTitle(expert, helpPartner.name)}
            </Text>
            <ScopeItems purpose="weitergabe_fachkraft" />
            <Text variant="labelStrong" style={styles.gapTop}>
              {de.help.noRecording}
            </Text>
            <Text variant="meta" style={styles.gapTop}>
              {de.help.legalBasis}
            </Text>
          </Card>
        </View>
        <View style={styles.full}>
          <Checkbox
            label={de.help.screenshots}
            sub={de.help.screenshotsSub(scopeList('screenshots_im_call'))}
            checked={screenshots}
            onChange={setScreenshots}
          />
        </View>
        <InfoBox>
          {contract
            ? de.help.costNote(insurer, formatEuro(state.demo.deductible))
            : de.help.costNoteNoContract}
        </InfoBox>
      </BotSays>,
    );
    reply('call', t.callStart, startCall, t.callSub);
    reply('vor-ort', t.onSite, () => setOnSite(true), t.onSiteSub);
    if (service) {
      reply(
        'kundendienst',
        service.label,
        () =>
          openPhone(service.phone).then(
            (ok) => ok || phoneNotice.show(de.common.phoneFailed(service.phone)),
          ),
        de.device.serviceSub(service.phone, service.freeOfCharge),
      );
    }
  } else if (can(facts, 'anleitung_fortsetzen') && run) {
    const g = guides[run.guideId as GuideId];
    if (g)
      tail.push(
        <BotSays key="laeuft" lines={[t.guideRunning(run.currentStep + 1, g.steps.length)]} />,
      );
    reply('anleitung', t.continueGuide, () => router.push(`/fall/${caseId}/anleitung`));
    reply('hilfe', de.result.helpInstead, escalate);
  } else if (canGuide) {
    const d = diagnoses.findLast((x) => x.source === 'fehlererkennung');
    const guide = d?.guideId ? guides[d.guideId as GuideId] : undefined;
    if (d?.errorPattern === 'geraet_erkannt') {
      reply('foto', de.result.photoDisplay, () => router.push(`/fall/${caseId}/kamera`));
    } else if (guide && hasGuides(device?.category)) {
      reply(
        'anleitung',
        de.result.startGuide,
        () => openGuide(guide.id),
        de.common.dot(de.result.stepsCount(guide.steps.length), de.result.source(manufacturer)),
      );
      reply('passt-nicht', de.result.doesNotFit, () =>
        router.replace({ pathname: '/fall/neu', params: { fall: caseId } }),
      );
      reply('hilfe', de.result.helpInstead, escalate);
    } else if (d) {
      reply('hilfe', de.result.getHelp, escalate);
    } else if (c.entry === 'foto') {
      reply(
        'foto',
        de.problem.photo,
        () => router.push(`/fall/${caseId}/kamera`),
        de.problem.photoSub,
      );
    } else if (!msgs.length && !assistant.waiting) {
      reply('hilfe', de.result.getHelp, escalate);
    }
  }

  if (assistant.pending) tail.push(<Typing key="typing" label={de.chat.typing} />);
  if (assistant.error && !assistant.waiting) {
    // Ohne Netz: ein ruhiger Hinweis, dann noch einmal senden oder als Notiz für die Fachkraft
    const offline = assistant.error === 'netz';
    tail.push(
      <InfoBox key="fehler">
        {assistant.noted
          ? offline
            ? de.chat.noteSaved
            : t.noteFallback
          : de.chat.errors[assistant.error]}
      </InfoBox>,
    );
    const ownLast = lastMsg?.role === 'haushalt' && !assistant.noted;
    if (retryableChatErrors.includes(assistant.error) && ownLast) {
      reply('nochmal', de.chat.retry, assistant.retry);
    }
    if (offline && ownLast) reply('notiz', de.chat.saveNote, assistant.saveNote);
    if (canHelp) reply('fehler-hilfe', de.chat.getHelp, escalate);
  }
  // Das Gespräch mit dem Assistenten ist voll: Senden ist aus, die Fachkraft hilft weiter (R-11)
  if (assistant.full && !assistant.pending && !assistant.error && !facts.closed) {
    tail.push(<InfoBox key="voll">{assistant.noted ? de.chat.fullNoted : de.chat.full}</InfoBox>);
    if (canHelp && !replies.some((r) => r.label === de.chat.getHelp)) {
      reply('voll-hilfe', de.chat.getHelp, escalate);
    }
  }

  const closed = facts.closed;
  const inputBar =
    closed || assistant.full ? undefined : (
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
            hint={de.chat.inputNotice}
            placeholder={a.otherPlaceholder}
            multiline
            rows={1}
            value={input}
            error={inputError}
            onChangeText={(v) => {
              setInput(v);
              setInputError(undefined);
            }}
          />
        </View>
        <Button
          label={de.chat.send}
          disabled={!input.trim() || assistant.pending}
          onPress={sendInput}
        />
      </View>
    );

  const footer = (
    <>
      {commandToast ? <Toast message={commandToast} style={styles.toast} /> : null}
      {replies.length ? (
        <QuickReplies replies={replies} onPick={(key) => handlers[key]?.()} footer={inputBar} />
      ) : (
        inputBar
      )}
    </>
  );

  return (
    <CaseScreen title={t.title(c.id)} footer={footer} scrollRef={scrollRef} onBack={leaveCase}>
      <DemoHint id="thread" />
      {ordered.map((x) => (
        <View key={x.key}>{x.node}</View>
      ))}
      {tail}
      <CallbackSheet
        caseId={caseId}
        slot={callbackSlot}
        onClose={() => setCallbackSlot(undefined)}
      />
    </CaseScreen>
  );
}

const styles = StyleSheet.create({
  full: { alignSelf: 'stretch' },
  stack: { gap: 8 },
  items: { marginTop: 8, gap: 2 },
  gapTop: { marginTop: 8 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputField: { flex: 1 },
  toast: { marginHorizontal: 16, marginBottom: 8 },
});
