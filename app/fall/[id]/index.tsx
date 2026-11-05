import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { KeyboardAwareScrollViewRef } from 'react-native-keyboard-controller';

import { AssistantConsentSheet } from '@/components/app/AssistantConsent';
import { BindingSummary } from '@/components/app/BindingSummary';
import { CallbackSheet } from '@/components/app/CallbackSheet';
import { CaseFileCard } from '@/components/app/CaseFileCard';
import { ChatInput } from '@/components/app/ChatInput';
import { CaseScreen, useCaseId } from '@/components/app/CaseScreen';
import { BotSays, QuickReplies, Typing, UserSaid, type Reply } from '@/components/app/Conversation';
import { CostCompare } from '@/components/app/CostCompare';
import { DemoHint } from '@/components/app/DemoHint';
import { GuideStepCard } from '@/components/app/GuideStepCard';
import { CloseCaseSheet } from '@/components/nav/CloseCaseSheet';
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
  Sheet,
  StarRating,
  Text,
  TextField,
  Toast,
  useReduceMotion,
} from '@/components/ds';
import { demoConfig } from '@/config/demo.config';
import type { GuideId } from '@/data/guides';
import { refusalText, useCommand } from '@/hooks/useCommand';
import { useNotificationDialog } from '@/hooks/useNotificationDialog';
import { useNotice } from '@/hooks/useNotice';
import { de } from '@/i18n/de';
import { formatDate, formatDecimal, formatEuro } from '@/i18n/format';
import { caseAppliance, guideForDevice, hasGuides } from '@/lib/appliance';
import {
  amountToPay,
  asksNotifications,
  bindsLater,
  costsLine,
  requestAppointment,
} from '@/lib/booking';
import { chatLimits } from '@/lib/chat/limits';
import {
  chatInputOpen,
  chatRecipient,
  photoForRecipient,
  recipientParam,
  recipientSelectable,
  type AttachedPhoto,
} from '@/lib/chat/recipient';
import { scopeList } from '@/lib/consent';
import { caseNames, textStamp } from '@/lib/legalTexts';
import { retryableChatErrors, useAssistant } from '@/lib/chat/useAssistant';
import { formatServiceHours } from '@/lib/serviceHours';
import { deviceTitle, getManufacturer } from '@/lib/devices';
import { getGuide, guidesForDevice } from '@/lib/guideCatalog';
import { guideEnding, guideTools, SAFETY_CONFIRM } from '@/lib/guideMeta';
import { guideThread, safetyConfirmed } from '@/lib/guideThread';
import { openMail, openPhone } from '@/lib/linking';
import { dealerService, insurerShortName, partnerKind, serviceFor } from '@/lib/service';
import { toDiagnosis } from '@/lib/diagnosis';
import { can } from '@/model/policies/actions';
import { selectCaseFacts } from '@/model/policies/caseFacts';
import { CONSENT_SCOPES, scopedConsent } from '@/model/policies/consentScopes';
import { hasProgress } from '@/model/policies/openCase';
import { earlierRounds, isFinding } from '@/model/policies/rounds';
import type { DealerSettings } from '@/model/portal';
import { partStatusOf } from '@/model/sharing';
import type { Result } from '@/model/result';
import type { CaseEvent, Cents, Diagnosis } from '@/model/types';
import { services, type FindingOption, type PhotoMode, type QuestionAnswer } from '@/services';
import {
  nextSimulationDue,
  notificationsOn,
  selectCaseEvents,
  useAppStore,
  type NewConsent,
} from '@/store/appStore';

const t = de.thread;

interface Item {
  at: string;
  key: string;
  node: ReactNode;
}

const answers: QuestionAnswer[] = ['ablauf', 'zulauf', 'unklar'];

/** Kurzname des Händlers aus der Konfiguration, sonst der Name am Ereignis */
const dealerShort = (e: CaseEvent) =>
  demoConfig.dealers.find((d) => d.id === e.actor.id)?.shortName ??
  e.actor.name ??
  de.sharing.actor.haendler;

/** Kontakt aus der Begrüßung des Händlers */
interface DealerContact {
  name: string;
  phone: string;
  email?: string;
  hours?: DealerSettings['profile']['hours'];
}

function ContactCard({
  contact,
  onFailed,
}: {
  contact: DealerContact;
  /** Lässt sich Telefon- oder Mail-App nicht öffnen: ein ruhiger Hinweis mit Nummer oder Adresse */
  onFailed: (text: string) => void;
}) {
  const c = de.sharing.contact;
  const { phone, email } = contact;
  return (
    <View style={styles.full}>
      <Card>
        <View style={styles.items}>
          <Text variant="label">{contact.name}</Text>
          <Text variant="body">{contact.phone}</Text>
          {contact.hours ? <Text variant="meta">{formatServiceHours(contact.hours)}</Text> : null}
          <View style={styles.links}>
            <Button
              label={c.call}
              variant="link"
              accessibilityHint={phone}
              onPress={() =>
                openPhone(phone.replace(/[^\d+]/g, '')).then(
                  (ok) => ok || onFailed(de.common.phoneFailed(phone)),
                )
              }
            />
            {email ? (
              <Button
                label={c.mail}
                variant="link"
                accessibilityHint={email}
                onPress={() =>
                  openMail(email).then((ok) => ok || onFailed(de.common.mailFailed(email)))
                }
              />
            ) : null}
          </View>
        </View>
      </Card>
    </View>
  );
}

/**
 * Der Fall als ein Gespräch (Entscheidung 11). Alles, was im Fall passiert, steht als Nachricht
 * im Verlauf: Ergebnis, Anleitung, Hilfe, Befund, Kosten, Termin und Status. Kamera, Anleitung
 * und Videocall öffnen sich als Vollbild und kehren hierher zurück. „Details“ zeigt die Formulare.
 * Der Verlauf entsteht aus dem gespeicherten Fall, er übersteht also jeden Neustart.
 */
export default function FallGespraech() {
  const caseId = useCaseId();
  const params = useLocalSearchParams<{
    weiter?: string;
    frage?: string;
    entwurf?: string;
    foto?: string;
    an?: string;
    senden?: string;
  }>();
  const state = useAppStore();
  const c = state.cases[caseId];
  const assistant = useAssistant(caseId);
  const scrollRef = useRef<KeyboardAwareScrollViewRef>(null);
  // Neue Nachrichten: sanft nach unten scrollen, bei „Bewegung reduzieren“ springen
  const reduceMotion = useReduceMotion();

  // Wahl im laufenden Gespräch, bevor sie gespeichert wird
  const [screenshots, setScreenshots] = useState(false);
  const [payment, setPayment] = useState<'selbst' | undefined>();
  const [onSite, setOnSite] = useState(false);
  const [partnerId, setPartnerId] = useState<string>();
  const [slot, setSlot] = useState<string>();
  /** Zeitfenster für den Rückruf, bis die Weitergabe bestätigt ist */
  const [callbackSlot, setCallbackSlot] = useState<string>();
  /** „Fall abbrechen“ nach einem Widerruf: das Sheet gleich mit dem Grund (Nr. 34) */
  const [cancelSheet, setCancelSheet] = useState(false);
  const [input, setInput] = useState('');
  const [inputError, setInputError] = useState<string>();
  // „Geht nicht“ in der Anleitung: Notiz für die Fachkraft
  const [notWorking, setNotWorking] = useState(false);
  const [note, setNote] = useState('');
  // Fall an den Händler: erst „Ja, senden“, dann senden (Entscheidung 28, 38)
  const [dealerConfirm, setDealerConfirm] = useState(false);
  // Einwilligung in den Assistenten, solange sie nicht im Profil steht (Entscheidung 38)
  const [consentSheet, setConsentSheet] = useState(false);
  // Eingabefeld: an den Assistenten oder an den Händler (Entscheidung 32). Ohne Wahl: wer zuletzt sprach.
  const [recipientPick, setRecipientPick] = useState<'assistent' | 'haendler'>();

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
  // Der Satz zu Mitteilungen steht nur vor „Termin anfragen“, wenn danach der Systemdialog kommt
  const dialog = useNotificationDialog(state.notifications === 'offen');
  const notify = asksNotifications(state, dialog);
  // Nach einem Widerruf: die Weitergabe noch einmal bestätigen (R-12)
  const renew = useCommand(() => useAppStore.getState().renewTransfer(caseId));
  // „Zahlungspflichtig buchen“ im eigenen Schritt (Nr. 31, Nr. 33), mit dem Betrag der Karte
  const bind = useCommand((shown: Cents) => useAppStore.getState().bookBinding(caseId, shown));
  // „Nicht buchen“: Die unverbindliche Anfrage endet ohne Kosten (Nr. 33)
  const decline = useCommand(() => useAppStore.getState().declineBinding(caseId));
  // Termin zur Nachbesserung in der Gewährleistung, ohne Betrag (Nr. 32)
  const rework = useCommand(
    (slotLabel: string) => useAppStore.getState().requestRework(caseId, slotLabel),
    () => setSlot(undefined),
  );
  // Anleitung starten: Ein zweiter Tap startet sie nicht noch einmal. Sie läuft im Gespräch
  // (Entscheidung 25), auch eine Anleitung aus dem Katalog des Modells.
  const guide = useCommand((guideId: string) => {
    const s = useAppStore.getState();
    const current = s.cases[caseId];
    if (current && !current.guideRunIds.length && current.entry === 'freitext') {
      s.updateCase(caseId, { problemLabel: getGuide(guideId)?.title ?? '' });
    }
    return s.startGuide(caseId, guideId);
  });
  // Antwort auf die Rückfrage und Befund der Fachkraft: je Tap genau einmal
  const answer = useCommand((choice: QuestionAnswer, question: CaseEvent): Result<unknown> => {
    const s = useAppStore.getState();
    s.addEvent({
      caseId,
      type: 'rueckfrage_beantwortet',
      actor: { kind: 'haushalt', id: s.persons[0]?.id },
      payload: { question: de.question.wasser, answer: de.question.answers[choice] },
    });
    // Die Anleitung passend zum Gerät, für ein Modell aus dem Katalog dessen eigene
    const raw = services.diagnosis.answer(choice);
    const device = s.devices.find((d) => d.id === s.cases[caseId]?.deviceId);
    const result = raw ? { ...raw, guideId: guideForDevice(device, raw.guideId) } : null;
    if (!result) return s.escalate(caseId);
    s.updateCase(caseId, { problemLabel: getGuide(result.guideId)?.title ?? '' });
    const photoId = question.payload.photoId as string | undefined;
    return s.addDiagnosis(
      toDiagnosis(caseId, photoId ? [photoId] : [], question.payload.mode as PhotoMode, result),
    );
  });
  const finding = useCommand((option: FindingOption) =>
    useAppStore.getState().setFinding(caseId, option, 'fachkraft'),
  );
  // „Ja, senden“: Ein Doppeltap sendet den Fall nicht zweimal an den Händler (Entscheidung 28)
  const dealerSend = useCommand(
    () => useAppStore.getState().shareWithDealer(caseId),
    () => setDealerConfirm(false),
  );
  // Lässt sich Telefon- oder Mail-App nicht öffnen, stehen Nummer oder Adresse im Hinweis
  const phoneNotice = useNotice();
  // Lehnt der Store eine Nachricht an den Händler ab, bleibt sie im Feld, mit einem ruhigen Satz
  const dealerNotice = useNotice();
  const commandToast =
    call.toast ??
    claim.toast ??
    book.toast ??
    renew.toast ??
    bind.toast ??
    decline.toast ??
    rework.toast ??
    guide.toast ??
    answer.toast ??
    finding.toast ??
    dealerSend.toast ??
    dealerNotice.notice ??
    phoneNotice.notice;

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
      // Die Anleitung läuft im Gespräch (Entscheidung 25), nur die Kamera öffnet sich als Vollbild
      if (weiter === 'kamera') router.push(`/fall/${caseId}/kamera`);
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

  // Aus den Details „Kosten“: gleich zeigen, was der Händler sieht, dann „Ja, senden“
  // (Übertragung 4.1). Gilt die Regel an_haendler_senden nicht, schließt die Karte wieder. Danach
  // fällt der Parameter weg, so öffnet ein zweiter Weg aus den Details die Karte erneut.
  const [sendParam, setSendParam] = useState<string>();
  if (params.senden !== sendParam) {
    setSendParam(params.senden);
    if (params.senden === 'haendler') setDealerConfirm(true);
  }
  useEffect(() => {
    if (!params.senden) return;
    const clear = () => router.setParams({ senden: undefined });
    // Beim Kaltstart direkt in den Fall ist der Router erst nach dem ersten Rendern bereit
    try {
      clear();
    } catch {
      setTimeout(clear, 0);
    }
  }, [params.senden]);

  // Frage zu einem Anleitungsschritt: Entwurf ins Eingabefeld (Zustand beim Rendern anpassen)
  const [draft, setDraft] = useState<string>();
  if (params.entwurf && params.entwurf !== draft) {
    setDraft(params.entwurf);
    setInput(params.entwurf);
  }
  // Foto für den Assistenten oder den Händler: hängt am Eingabefeld, bis du sendest (Entscheidungen
  // 26, 32). Es bleibt bei dem Empfänger, für den du es aufgenommen hast (`an`).
  const [photoParam, setPhotoParam] = useState<string>();
  const [attached, setAttached] = useState<AttachedPhoto>();
  if (params.foto && params.foto !== photoParam) {
    setPhotoParam(params.foto);
    setAttached({ id: params.foto, an: recipientParam(params.an) });
  }

  const events = c ? selectCaseEvents(state, caseId) : [];
  const last = events.at(-1)?.id;
  const msgs = state.chatMessages.filter((m) => m.caseId === caseId);
  useEffect(() => {
    const id = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: !reduceMotion }), 80);
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
    // „Fall an … senden“: deine Antwort steht unten über „Ja, senden“
    dealerConfirm,
    reduceMotion,
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
  const insurer = insurerShortName(state, caseId);
  const svc = serviceFor(device);
  const expert = svc.expert.name;
  const manufacturer = device ? getManufacturer(device.manufacturerId).name : '';
  const service = device ? getManufacturer(device.manufacturerId).serviceContact : undefined;
  const helpPartner = svc.expert.partner;
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

  // Gespräch mit dem Händler (Entscheidung 32): nur, solange der Fall bei ihm ist und offen
  // (haendler_schreiben). Wer zuletzt sprach, bekommt die Antwort.
  const dealer = facts.soldBy;
  const dealerName = dealer
    ? (demoConfig.dealers.find((d) => d.id === dealer.id)?.shortName ?? dealer.name)
    : '';
  const dealerWritable = can(facts, 'haendler_schreiben');
  // Angebot und Karte „Fall an … senden“ nur, solange die Regel an_haendler_senden gilt. Endet
  // sie, etwa weil der Fall inzwischen geschlossen ist, schließt die Karte (Zustand beim Rendern).
  const dealerOffer = !!dealer && can(facts, 'an_haendler_senden');
  if (dealerConfirm && !dealerOffer) setDealerConfirm(false);
  const lastDealerAt =
    events.filter((e) => e.actor.kind === 'haendler' || e.type === 'nachricht_an_haendler').at(-1)
      ?.at ?? '';
  // Ist das Gespräch mit dem Assistenten voll, geht die Nachricht an den Händler (R-11). Ein
  // angehängtes Foto hält seinen Empfänger, auch wenn inzwischen der andere geschrieben hat.
  const recipient = chatRecipient({
    dealerShared: dealerWritable,
    assistantFull: assistant.full,
    pick: recipientPick,
    dealerSpokeLast: lastDealerAt > (msgs.at(-1)?.at ?? ''),
    photoFor: attached?.an,
  });
  // Nur ein Foto für diesen Empfänger geht mit. Passt er nicht mehr, bleibt das Foto hier.
  const photoToSend = photoForRecipient(attached, recipient);
  const attachedPhoto = photoToSend ? state.photos.find((p) => p.id === photoToSend.id) : undefined;
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

  // Sheet „Reparatur-Assistent nutzen“: Ja schickt die wartende Nachricht, Nein macht sie zur Notiz
  const acceptAssistant = () => {
    setConsentSheet(false);
    assistant.accept();
  };
  const declineAssistant = () => {
    setConsentSheet(false);
    assistant.decline();
    escalate();
  };

  // Der Tap bestätigt die Weitergabe an die Fachkraft. Der Store speichert sie mit dem Call.
  // Umfang und Rechtsgrundlage kommen aus CONSENT_SCOPES, wie im Profil unter „Datenschutz“ (R-14,
  // Entscheidung 38). Der Stempel trägt die Namen des Falls (beim Händler-Gerät sein Kundendienst).
  const startCall = () => {
    const recipient = { id: helpPartner.id, kind: 'betrieb' as const, name: helpPartner.name };
    const names = caseNames(state, caseId);
    call.run({
      share: scopedConsent('weitergabe_fachkraft', {
        caseId,
        recipient,
        text: textStamp('fachkraft_videocall', names),
      }),
      screenshots: screenshots
        ? scopedConsent('screenshots_im_call', {
            caseId,
            recipient,
            text: textStamp('screenshots', names),
          })
        : undefined,
    });
  };

  // Läuft dieselbe Anleitung schon, geht startGuide dort weiter (R-06)
  const openGuide = guide.run;
  const answerQuestion = answer.run;
  const confirmFinding = finding.run;

  // Anleitung im Gespräch: Erledigt, Geht nicht, Ende (Entscheidung 25)
  const guideStep = (direction: 'next' | 'back') => {
    if (!run || run.endedAt) return;
    if (direction === 'next') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    }
    useAppStore.getState().moveGuideStep(run.id, direction);
  };
  const finishGuide = (
    outcome: 'laeuft_wieder' | 'laeuft_nicht' | 'geht_nicht' | 'fertig',
    text?: string,
  ) => {
    if (!run || run.endedAt) return;
    const s = useAppStore.getState();
    if (outcome === 'laeuft_wieder') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    }
    // Geht nicht oder läuft nicht: Der Store holt mit dem Ende der Anleitung auch Hilfe
    s.finishGuide(run.id, outcome, text);
    setNotWorking(false);
    setNote('');
  };

  const declineFinding = () => {
    const s = useAppStore.getState();
    s.addEvent({
      caseId,
      type: 'rueckfrage_beantwortet',
      actor: { kind: 'haushalt', id: s.persons[0]?.id },
      payload: { question: t.findingQuestion, answer: t.findingWrongAnswer },
    });
  };

  const shareWithDealer = dealerSend.run;

  const answerDealer = (question: CaseEvent, answer: string) => {
    const s = useAppStore.getState();
    s.addEvent({
      caseId,
      type: 'rueckfrage_beantwortet',
      actor: { kind: 'haushalt', id: s.persons[0]?.id },
      payload: {
        question:
          question.type === 'haendler_termin'
            ? de.sharing.slotOffer(String(question.payload.partnerName ?? ''))
            : String(question.payload.question),
        answer,
        questionEventId: question.id,
      },
    });
  };

  const report = claim.run;

  const request = () => {
    if (!partnerId || !slot) return;
    book.run({ caseId, partnerId, slot, selfPay, diagnosis: onSite, noticeShown: notify });
  };

  const sendInput = () => {
    const toDealer = recipient === 'haendler';
    const text =
      input.trim() || (photoToSend ? (toDealer ? de.sharing.photoOnly : de.chat.photoDefault) : '');
    if (!text) return;
    if (text.length > chatLimits.chars) {
      setInputError(de.chat.tooLong(chatLimits.chars));
      return;
    }
    if (toDealer) {
      const sent = useAppStore.getState().messageDealer(caseId, text, photoToSend?.id);
      if (!sent.ok) {
        dealerNotice.show(refusalText(sent.refusal));
        return;
      }
    } else assistant.send(text, photoToSend?.id);
    setInput('');
    setAttached(undefined);
  };
  const photoOf = (id: string | undefined) =>
    id ? (state.photos.find((p) => p.id === id)?.uri ?? '') : undefined;

  // ---------- Verlauf ----------

  const items: Item[] = [];
  const add = (at: string, key: string, node: ReactNode) => items.push({ at, key, node });
  const details = (path: string) => (
    <Button
      label={t.details}
      variant="link"
      testID={`details-${path}`}
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
    // Fotos zur Frage stehen an der Nachricht an den Assistenten
    if (purpose === 'abschluss' || purpose === 'schritt' || purpose === 'frage') continue;
    add(e.at, e.id, <UserSaid text={t.photo(de.caseFile.photoPurpose[purpose] ?? '')} />);
  }

  // Rückfragen und Antworten
  for (const e of of('rueckfrage_gestellt')) {
    add(e.at, e.id, <BotSays lines={[de.question.wasser]} />);
  }
  for (const e of of('rueckfrage_beantwortet')) {
    const q = String(e.payload.question);
    if (q === de.question.wasser) add(e.at, e.id, <UserSaid text={String(e.payload.answer)} />);
    if (q === de.problem.otherTitle) add(e.at, e.id, <UserSaid text={String(e.payload.answer)} />);
    if (q === t.findingQuestion) {
      add(e.at, e.id, <UserSaid text={t.findingWrongAnswer} />);
      add(e.at, `${e.id}-a`, <BotSays lines={[t.findingWrongText]} />);
    }
    // Antwort auf eine Rückfrage des Händlers
    if (e.payload.questionEventId) add(e.at, e.id, <UserSaid text={String(e.payload.answer)} />);
  }

  // Fall an den Händler und seine Antworten (Entscheidung 28, 29)
  for (const e of of('weitergabe_bestaetigt')) {
    if (e.payload.purpose !== 'weitergabe_haendler') continue;
    const name = String(e.payload.recipient);
    add(e.at, e.id, <UserSaid text={de.sharing.offer(name)} />);
    add(e.at, `${e.id}-a`, <BotSays lines={[de.sharing.sent(name)]} />);
  }
  for (const e of events) {
    // Deine Nachrichten an den Händler (Entscheidung 32)
    if (e.type === 'nachricht_an_haendler') {
      const to = device?.soldBy
        ? (demoConfig.dealers.find((d) => d.id === device.soldBy?.id)?.shortName ??
          device.soldBy.name)
        : de.sharing.actor.haendler;
      add(
        e.at,
        e.id,
        <UserSaid
          text={String(e.payload.text ?? '')}
          photoUri={photoOf(e.payload.photoId as string | undefined)}
          to={de.sharing.sentTo(to)}
        />,
      );
      continue;
    }
    if (e.actor.kind !== 'haendler') continue;
    const short = dealerShort(e);
    const p = e.payload;
    const name = de.sharing.sender(p.by ? String(p.by) : undefined, short);
    let lines: string[] = [];
    let hint: string | undefined;
    let extra: ReactNode;
    if (e.type === 'haendler_angenommen') lines = [de.sharing.accepted(short)];
    if (e.type === 'haendler_rueckfrage') lines = [String(p.question ?? '')];
    if (e.type === 'haendler_nachricht') {
      lines = [String(p.text ?? '')];
      const contact = p.contact as DealerContact | undefined;
      if (contact?.phone) extra = <ContactCard contact={contact} onFailed={phoneNotice.show} />;
    }
    if (e.type === 'haendler_termin') lines = [de.sharing.slotOffer(String(p.partnerName ?? ''))];
    if (e.type === 'haendler_ersatzteil') {
      lines = [
        de.sharing.part(String(p.part ?? ''), partStatusOf(p), p.eta ? String(p.eta) : undefined),
      ];
    }
    if (e.type === 'haendler_entscheidung') {
      lines = [de.sharing.decision[p.decision as keyof typeof de.sharing.decision] ?? ''];
      hint = p.note ? String(p.note) : undefined;
    }
    if (e.type === 'haendler_betrieb') {
      lines = [
        de.sharing.partner(String(p.partnerName ?? ''), p.slot ? String(p.slot) : undefined),
      ];
    }
    if (e.type === 'haendler_status') {
      lines = [de.sharing.status[p.status as keyof typeof de.sharing.status] ?? ''];
      hint = p.note ? String(p.note) : undefined;
    }
    if (lines.some(Boolean)) {
      add(
        e.at,
        e.id,
        <BotSays name={name} lines={lines} hint={hint}>
          {extra}
        </BotSays>,
      );
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
      add(d.createdAt, d.id, <BotSays lines={[de.result.noGuideTitle]} />);
      continue;
    }
    const pattern = d.errorPattern as keyof typeof de.result.headline;
    add(
      d.createdAt,
      d.id,
      <BotSays lines={[de.result.headline[pattern] ?? '']}>
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
        {/* Ein verworfenes Ergebnis („Passt nicht“) bleibt im Verlauf, ohne Details: Es gilt nicht mehr */}
        {d.discardedAt ? null : details('ergebnis')}
      </BotSays>,
    );
  }

  // Anleitungen. Eine, die ohne Schritt endete, weil du ein anderes Problem gewählt hast, ist
  // kein Angebot mehr. Sie steht nur in der Fallakte.
  for (const r of runs) {
    const guide = getGuide(r.guideId);
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
    // Die Schritte als Nachrichten. Aktiv ist nur der letzte gezeigte Schritt einer laufenden Anleitung.
    const flow = guideThread(r, events, guide.steps.length);
    const lastShown = flow.findLast((x) => x.kind === 'schritt');
    const lastDone = flow.at(-1)?.kind === 'schritt' ? flow.at(-2) : undefined;
    const ending = guideEnding(guide, c);
    for (const x of flow) {
      const active = !r.endedAt && x === lastShown;
      if (x.kind === 'schritt') {
        const isLast = x.step >= guide.steps.length - 1;
        add(
          x.at,
          x.key,
          <BotSays sender={false} lines={[]}>
            <View style={styles.full}>
              <GuideStepCard
                guide={guide}
                step={x.step}
                current={active}
                question={isLast && ending === 'stoerung' ? a.runsAgain : undefined}
              />
            </View>
            {active ? <View style={styles.links}>{details('anleitung')}</View> : null}
          </BotSays>,
        );
      } else if (x.kind === 'erledigt') {
        // Der Stift am letzten „Erledigt“ geht einen Schritt zurück (B-05)
        const editable = !r.endedAt && x === lastDone;
        add(
          x.at,
          x.key,
          <UserSaid text={de.guide.done} onEdit={editable ? () => guideStep('back') : undefined} />,
        );
      } else if (x.kind === 'zurueck') {
        add(x.at, x.key, <UserSaid text={de.guide.stepBack} />);
      } else {
        const confirmKey = SAFETY_CONFIRM[guide.id as GuideId]?.[x.step];
        if (confirmKey) add(x.at, x.key, <UserSaid text={de.guide.confirm[confirmKey]} />);
      }
    }
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

  // „Problem besteht weiter“: neue Runde, und wenn es eine Reparatur gab, warum ohne
  // Nachbesserung. In der Gewährleistung bessert der Betrieb nach (Nr. 32).
  for (const e of of('problem_besteht_weiter')) {
    add(e.at, e.id, <UserSaid text={t.stillBroken} />);
    const reason = e.payload.warranty;
    if (reason === 'abgelaufen' || reason === 'nachbesserung_gescheitert') {
      add(
        e.at,
        `${e.id}-a`,
        <BotSays
          lines={[reason === 'abgelaufen' ? de.rework.expired : de.rework.failed]}
          hint={de.rework.newRound}
        />,
      );
    }
  }
  for (const e of of('nachbesserung_verlangt')) {
    const partner = String(e.payload.partner);
    add(e.at, e.id, <UserSaid text={t.stillBroken} />);
    add(
      e.at,
      `${e.id}-a`,
      <BotSays lines={[de.rework.title]} hint={de.rework.text(partner)}>
        {contract ? <Text variant="body">{de.rework.noClaim(insurer)}</Text> : null}
        <Text variant="meta">
          {de.rework.until(formatDate(String(e.payload.until)), demoConfig.warranty.repairMonths)}
        </Text>
      </BotSays>,
    );
  }

  // Hilfe holen
  for (const e of of('status_geaendert')) {
    if (e.payload.to !== 'eskaliert') continue;
    add(e.at, e.id, <BotSays lines={[t.helpIntro]} />);
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

  // Kosten und Schadenmeldung, auch aus früheren Runden vor „Problem besteht weiter“
  const earlier = earlierRounds(c).findings;
  const costRounds = [
    ...(c.rounds ?? []).map((r) => ({
      quoteId: r.quoteId,
      claim: r.claim,
      finding: diagnoses.findLast((d) => r.findingIds.includes(d.id)),
    })),
    {
      quoteId: c.quoteId,
      claim: c.claim,
      finding: diagnoses.findLast((d) => isFinding(d) && !earlier.has(d.id)),
    },
  ];
  for (const r of costRounds) {
    const roundQuote = state.quotes.find((q) => q.id === r.quoteId);
    if (!roundQuote) continue;
    const { finding } = r;
    const replacement = finding?.errorPattern === 'ersatzgeraet_noetig';
    add(
      roundQuote.createdAt,
      roundQuote.id,
      <BotSays lines={[replacement ? de.costs.titleReplacement : de.costs.title]}>
        <View style={styles.full}>
          <CostCompare quote={roundQuote} focus={replacement ? 'replacement' : 'repair'} />
        </View>
        {roundQuote.id === quote?.id ? details('kosten') : null}
      </BotSays>,
    );
    if (r.claim) {
      add(r.claim.reportedAt, `claim-${roundQuote.id}`, <UserSaid text={de.costs.report} />);
      add(
        r.claim.reportedAt,
        `claim-${roundQuote.id}-a`,
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
    add(
      e.at,
      e.id,
      <UserSaid
        text={
          e.payload.rework
            ? de.rework.bookingAnswer(b.slotLabel, b.provider.name)
            : t.bookingAnswer(b.slotLabel, b.provider.name)
        }
      />,
    );
    add(
      e.at,
      `${e.id}-a`,
      <BotSays
        lines={[de.status.headline.angefragt]}
        hint={
          // Zur Vor-Ort-Diagnose nennt der Betrieb erst den Preis (Nr. 33)
          b.kind === 'vor_ort_diagnose'
            ? de.status.text.angefragtDiagnose(b.provider.name)
            : notificationsOn(state)
              ? de.status.text.angefragt(b.provider.name)
              : de.status.text.angefragtImFall(b.provider.name)
        }
      >
        {details('status')}
      </BotSays>,
    );
  }
  // Der Betrieb nennt den Preis für die Vor-Ort-Diagnose (Nr. 33)
  for (const e of of('preis_genannt')) {
    const partner = String(e.payload.partner);
    add(
      e.at,
      e.id,
      <BotSays
        name={partner}
        lines={[de.appointment.priceNamed(partner, formatEuro(Number(e.payload.price)))]}
      />,
    );
  }
  // „Nicht buchen“: Die Anfrage endet, der Fall bietet wieder, was er vorher bot
  for (const e of of('nicht_gebucht')) {
    add(e.at, e.id, <UserSaid text={de.appointment.decline} />);
    add(e.at, `${e.id}-a`, <BotSays lines={[de.appointment.declined]} />);
  }
  // Der eigene Schritt „Zahlungspflichtig buchen“ (Nr. 31, Nr. 33). Beim Buchen mit bekanntem
  // Preis steht der Tap schon in der Terminanfrage.
  for (const e of of('zahlungspflichtig_gebucht')) {
    if (!e.payload.separateStep) continue;
    const partner = String(e.payload.partner);
    add(e.at, e.id, <UserSaid text={de.appointment.requestPaid} />);
    add(
      e.at,
      `${e.id}-a`,
      <BotSays
        lines={[de.appointment.booked]}
        hint={
          notificationsOn(state)
            ? de.status.text.angefragt(partner)
            : de.status.text.angefragtImFall(partner)
        }
      />,
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
      <BotSays
        lines={[de.finish.repairedTitle]}
        hint={
          e.payload.rework
            ? de.rework.done(b?.provider.name ?? '')
            : a.finding.repaired(b?.provider.name ?? '')
        }
      >
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
  // Mit dem Abbruch bekommt der Betrieb die Absage. Hatte er den Auftrag, klärt er mit dir, ob
  // schon Kosten entstanden sind (Nr. 34). Kein Versprechen, dass es nichts kostet.
  for (const e of of('termin_abgesagt')) {
    const partner = String(e.payload.partner);
    add(
      e.at,
      e.id,
      <BotSays
        lines={[de.closeCase.partnerNotice(partner)]}
        hint={e.payload.costsOpen ? de.closeCase.costsOpen(partner) : undefined}
      />,
    );
  }

  // Gespräch mit dem Reparatur-Assistenten. Dass ein Computerprogramm antwortet, steht in der
  // Einwilligung im Profil (Entscheidung 38), über jeder Folge steht sein Name.
  msgs.forEach((m, i) =>
    add(
      m.at,
      m.id,
      m.role === 'haushalt' ? (
        <UserSaid text={m.text} photoUri={photoOf(m.photoId)} />
      ) : (
        <BotSays name={de.chat.title} sender={msgs[i - 1]?.role !== 'assistent'} lines={[m.text]}>
          {/* Einschätzung zum Foto (Entscheidung 26) */}
          {m.assessment ? (
            <Text variant="body" tone="muted">
              {de.chat.assessment[m.assessment]}
            </Text>
          ) : null}
        </BotSays>
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
  // Nur, solange Hilfe angefragt ist: Eine Nachbesserung bekommt keinen Rückruf (Nr. 32)
  const noExpert =
    can(facts, 'videocall_anfragen') &&
    lastSession?.outcome === 'keine_fachkraft' &&
    !after(lastSession.endedAt, 'videocall_angefragt', (e) => e.payload.art === 'rueckruf') &&
    !booking;
  const awaitingConfirm = can(facts, 'reparatur_bestaetigen');
  // Befund der laufenden Runde
  const replacement = facts.replacement;
  const costsOpen =
    !repairBooking &&
    !selfPay &&
    !replacement &&
    (can(facts, 'schaden_melden') || can(facts, 'selbst_zahlen'));
  // Ohne Schutz steht der Zahler noch nicht fest, solange ein Regulierer die Kosten übernehmen kann,
  // etwa der Händler. Dann nennt Selbstzahlen den Preis schon auf dem Button, und vor diesem Tap
  // steht kein „Du zahlst“ (Übertragung 4.1).
  const payerOpen = !facts.hasContract && facts.payer === undefined;
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
    // Nur Anleitungen, die es für dieses Gerät im Katalog gibt
    const g = guidesForDevice(device).find((x) => x.id === lastMsg.guideId);
    if (lastMsg.suggestion === 'anleitung' && canGuide && !sameGuideRunning && g) {
      reply('vorschlag-anleitung', de.chat.startGuide(g.title), () => openGuide(g.id));
    }
    if (lastMsg.suggestion === 'hilfe' && canHelp) {
      reply('vorschlag-hilfe', de.chat.getHelp, escalate);
    }
  }

  // Offene Rückfrage oder Terminvorschlag des Händlers: Antworten als Buttons. Nur, solange du ihm
  // schreiben kannst (haendler_schreiben), nach einem Widerruf oder im geschlossenen Fall nicht.
  const dealerQuestion = !dealerWritable
    ? undefined
    : events
        .filter((q) => q.type === 'haendler_rueckfrage' || q.type === 'haendler_termin')
        .filter(
          (q) => !of('rueckfrage_beantwortet').some((a) => a.payload.questionEventId === q.id),
        )
        // Ein Termin, den der Händler danach selbst festgelegt hat, braucht keine Wahl mehr
        .filter(
          (q) =>
            q.type !== 'haendler_termin' ||
            !of('haendler_betrieb').some((b) => b.at > q.at && b.payload.slot),
        )
        .at(-1);

  if (dealerQuestion && !assistant.waiting) {
    const raw = dealerQuestion.payload.options ?? dealerQuestion.payload.slots;
    const options = Array.isArray(raw) ? (raw as string[]) : [];
    for (const [i, o] of (options.length ? options : de.sharing.defaultOptions).entries()) {
      reply(`haendler-antwort-${i}`, o, () => answerDealer(dealerQuestion, o));
    }
  } else if (dealerConfirm && dealerOffer && dealer) {
    // Senden erst mit „Ja, senden“. Wer was sieht, steht im Profil unter „Datenschutz“
    // (Entscheidung 38). Gestempelt sind die Antwort und „Ja, senden“ (haendler_weitergabe).
    tail.push(
      <UserSaid
        key="haendler"
        text={de.sharing.offer(dealer.name)}
        onEdit={() => setDealerConfirm(false)}
      />,
    );
    reply('haendler-senden', de.sharing.send, shareWithDealer);
    reply('haendler-nicht', de.sharing.cancel, () => setDealerConfirm(false));
  } else if (assistant.waiting) {
    // Die Einwilligung fehlt (sonst steht sie im Profil, Entscheidung 38): Die Nachricht wartet,
    // der Text der Einwilligung steht im Sheet, nicht im Gespräch.
    tail.push(
      <UserSaid
        key="consent"
        text={assistant.waiting.text}
        photoUri={photoOf(assistant.waiting.photoId)}
      />,
    );
    reply('einverstanden', de.chat.consentOpen, () => setConsentSheet(true));
    reply('ablehnen', de.chat.consentDecline, declineAssistant);
  } else if (facts.closed && !can(facts, 'problem_besteht_weiter')) {
    // Abgebrochen, oder erledigt, während für das Gerät ein anderer Fall offen ist (Nr. 13)
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
      // Kann der Händler die Kosten übernehmen (Regulierer, U10), steht „Fall an … senden“ zuerst.
      // Selbstzahlen nur mit Preis, nie „Weiter zum Termin“: Das führte gleich zu „Zahlungspflichtig
      // buchen“ (Übertragung 4.1). Solange der Zahler offen ist, passt die Frage zu dieser Antwort,
      // auch wenn der Fall schon beim Händler ist und nur Selbstzahlen bleibt.
      const dealerFirst = facts.regulator?.kind === 'haendler' && dealerOffer ? dealer : undefined;
      tail.push(
        <BotSays key="kosten" sender={false} lines={[]}>
          <Text variant="title">
            {payerOpen
              ? de.talk.claim.askCosts
              : dealerService(device)
                ? de.talk.claim.askDealer(helpPartner.name)
                : de.talk.claim.askNoContract}
          </Text>
        </BotSays>,
      );
      if (dealerFirst) {
        reply(
          'haendler',
          de.sharing.offer(dealerFirst.name),
          () => setDealerConfirm(true),
          de.sharing.offerSub(dealerName),
        );
      }
      reply(
        'selbst',
        payerOpen
          ? t.rejectedChoice.selfPay(formatEuro(quote?.repair.total ?? 0))
          : de.costs.toAppointment,
        () => setPayment('selbst'),
      );
    }
  } else if (replacement && can(facts, 'schaden_melden')) {
    reply('melden', de.costs.report, report);
  } else if (facts.hold) {
    // Widerrufene Weitergabe: Versicherer und Betrieb machen nicht weiter (R-12). Mit einem Tap
    // bestätigst du sie noch einmal, mit demselben Text wie beim ersten Mal. So bleibt auch ein
    // Fall in der Reparatur keine Sackgasse. Abbrechen geht dort seit Nr. 34 auch.
    const toInsurer = facts.hold === 'weitergabe_versicherer';
    // Vor dem Termin zur Nachbesserung ist es der Betrieb der Reparatur (Nr. 32)
    const recipient = toInsurer
      ? insurer
      : (facts.booking?.provider.name ?? facts.rework?.provider.name ?? '');
    const reviewing = facts.claim === 'in_pruefung';
    tail.push(
      <BotSays
        key="angehalten"
        lines={[reviewing ? de.status.headline.pruefung(insurer) : de.status.text.paused]}
        hint={reviewing ? de.status.text.paused : undefined}
      >
        <Text variant="body">{t.renewAsk(recipient)}</Text>
        {toInsurer ? (
          <>
            <View style={styles.full}>
              <Disclosure title={de.costs.preview(insurer)}>
                <CaseFileCard
                  caseId={caseId}
                  categories={CONSENT_SCOPES.weitergabe_versicherer.dataCategories}
                />
              </Disclosure>
            </View>
            <Text variant="meta">{de.costs.legal(insurer)}</Text>
          </>
        ) : (
          <Text variant="meta">{de.appointment.shares(scopeList('weitergabe_betrieb'))}</Text>
        )}
      </BotSays>,
    );
    reply('weitergabe-erneuern', t.renewShare, () => renew.run(), recipient);
    // Statt weiterzumachen den Fall abbrechen, auch in der Reparatur (Nr. 34). Das Sheet nennt
    // die Absage an den Betrieb, bevor du abbrichst.
    if (can(facts, 'abbrechen')) {
      reply('abbrechen', de.closeCase.cancel, () => setCancelSheet(true));
    }
    reply('status', de.status.caseFile, () => router.push(`/fall/${caseId}/fallakte`));
  } else if (can(facts, 'zahlungspflichtig_buchen') && facts.bindingDue) {
    // Nach der Freigabe oder nach dem Preis für die Vor-Ort-Diagnose: Erst dieser Tap macht die
    // Anfrage verbindlich, vorher bestätigt der Betrieb nicht (Nr. 31, Nr. 33). Die Karte zeigt,
    // was der Store mit dem Tap stempelt. „Nicht buchen“ beendet die Anfrage ohne Kosten.
    const due = facts.bindingDue;
    tail.push(
      <BotSays
        key="verbindlich"
        lines={[de.appointment.bindingTitle]}
        hint={de.appointment.bindingAsk}
      >
        <BindingSummary due={due} partName={quote?.repair.partName} />
        {details('termin')}
      </BotSays>,
    );
    reply('zahlungspflichtig', de.appointment.requestPaid, () => bind.run(due.amount));
    if (can(facts, 'nicht_buchen')) {
      reply('nicht-buchen', de.appointment.decline, () => decline.run(), de.appointment.declineSub);
    }
  } else if (can(facts, 'nachbesserung_anfragen') && facts.rework) {
    // Nachbesserung in der Gewährleistung (Nr. 32): derselbe Betrieb, ohne Betrag und ohne
    // „Zahlungspflichtig buchen“. Die Weitergabe hat der Betrieb schon, sie muss gültig sein.
    const partner = facts.rework.provider.name;
    tail.push(<BotSays key="nachbesserung" lines={[de.rework.when(partner)]} />);
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
                  [de.appointment.facts.partner, partner],
                  [de.appointment.facts.slot, slot],
                  [
                    de.appointment.facts.address,
                    address
                      ? de.appointment.addressLine(address.street, address.zip, address.city)
                      : '',
                  ],
                  [de.appointment.facts.job, de.rework.job(a.finding.component)],
                  [de.appointment.facts.costs, de.rework.costs],
                ]}
              />
            </Card>
          </View>
          <Text variant="meta">{de.appointment.shares(scopeList('weitergabe_betrieb'))}</Text>
        </BotSays>,
      );
      reply('nachbesserung', de.rework.request, () => rework.run(slot));
    }
  } else if (needsAppointment) {
    if (selfPay && quote) {
      tail.push(
        <View key="zahlung" style={styles.stack}>
          <UserSaid
            text={
              rejected || payerOpen
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
    const partner = svc.partners.find((p) => p.id === partnerId);
    tail.push(<BotSays key="wer" lines={[onSite ? t.diagnosisAsk : de.appointment.titleRepair]} />);
    if (!partner) {
      for (const p of svc.partners) {
        reply(
          `betrieb-${p.id}`,
          p.name,
          () => setPartnerId(p.id),
          de.common.dot(
            partnerKind(p, manufacturer),
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
        // Steht fest, was du zahlst, ist der Tap verbindlich. Während der Prüfung mit
        // Selbstbeteiligung kommt der verbindliche Schritt erst nach der Freigabe (Nr. 31).
        const paid = amountToPay(state, caseId, selfPay, onSite) > 0;
        const later = bindsLater(state, caseId, selfPay, onSite);
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
            {later ? <Text variant="body">{de.appointment.pendingBinding(insurer)}</Text> : null}
            {/* Der Hinweis zum Ökodesign-Recht steht in „Details“ zum Termin (termin.tsx) */}
            <Text variant="meta">{de.appointment.shares(scopeList('weitergabe_betrieb'))}</Text>
            {notify ? <Text variant="meta">{de.appointment.notificationsNotice}</Text> : null}
            {paid ? <Text variant="body">{de.appointment.bindingNotice(partner.name)}</Text> : null}
          </BotSays>,
        );
        reply('anfragen', paid ? de.appointment.requestPaid : de.appointment.request, request);
      }
    }
  } else if (callbackWaiting) {
    // Rückruf angefragt: Die Fachkraft meldet sich. Vor Ort geht immer noch.
    reply('vor-ort', de.waiting.onSiteInstead, () => setOnSite(true));
    reply('fallakte', t.caseFile, () => router.push(`/fall/${caseId}/fallakte`));
  } else if (facts.bookingOpen) {
    if (facts.claim === 'in_pruefung')
      tail.push(
        <BotSays
          key="pruefung"
          lines={[de.status.headline.pruefung(insurer)]}
          hint={notificationsOn(state) ? de.status.text.pruefung : de.status.text.pruefungImFall}
        />,
      );
    if (demoTap) reply('demo', t.demoNext, () => useAppStore.getState().simulateNext(caseId));
    reply('status', de.status.caseFile, () => router.push(`/fall/${caseId}/fallakte`));
  } else if (can(facts, 'videocall_anfragen')) {
    // Hilfe holen: Wer was sieht, steht im Profil unter „Datenschutz“ (Entscheidung 38). Hier
    // bleiben die Kosten mit Schutz und das freiwillige Kästchen für Screenshots.
    tail.push(
      <BotSays key="hilfe" sender={false} lines={[]}>
        {contract ? (
          <Text variant="meta">{de.help.costNote(insurer, formatEuro(state.demo.deductible))}</Text>
        ) : null}
        <View style={styles.full}>
          <Checkbox label={de.help.screenshots} checked={screenshots} onChange={setScreenshots} />
        </View>
      </BotSays>,
    );
    reply('call', t.callStart, startCall, t.callSub);
    // Mit Händler-Kundendienst kommt dieser, und die Hotline des Herstellers entfällt
    const viaDealer = !!dealerService(device);
    reply(
      'vor-ort',
      t.onSite,
      () => setOnSite(true),
      viaDealer ? t.onSiteSubDealer(helpPartner.name) : undefined,
    );
    if (service && !viaDealer) {
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
    // Die Anleitung läuft im Gespräch (Entscheidung 25): Erledigt, Geht nicht, Sicherheit
    const g = getGuide(run.guideId);
    if (g) {
      const step = Math.min(run.currentStep, g.steps.length - 1);
      const isLast = step >= g.steps.length - 1;
      const ending = guideEnding(g, c);
      const confirmKey = SAFETY_CONFIRM[g.id as GuideId]?.[step];
      // Nach Fragen an den Assistenten steht der Schritt weiter oben: kurz daran erinnern
      const shownAt = guideThread(run, events, g.steps.length).findLast(
        (x) => x.kind === 'schritt',
      )?.at;
      if (shownAt && msgs.some((m) => m.at > shownAt)) {
        tail.push(
          <BotSays
            key="laeuft"
            lines={[t.guideRunning(step + 1, g.steps.length)]}
            hint={g.steps[step]!.t}
          />,
        );
      }
      if (confirmKey && !safetyConfirmed(run, events, step)) {
        // Erst bestätigen, dann geht es weiter (Q-13)
        reply('sicherheit', de.guide.confirm[confirmKey], () =>
          useAppStore.getState().confirmSafety(run.id, step),
        );
      } else if (isLast && ending === 'noSelf') {
        reply('hilfe', de.guide.getHelp, () => finishGuide('laeuft_nicht'));
      } else if (isLast && ending === 'stoerung') {
        reply('laeuft', de.guide.runsAgain, () => finishGuide('laeuft_wieder'));
        reply('laeuft-nicht', de.guide.stillBroken, () => finishGuide('laeuft_nicht'));
      } else {
        reply('erledigt', isLast ? de.guide.finished : de.guide.done, () =>
          isLast ? finishGuide('fertig') : guideStep('next'),
        );
        reply('geht-nicht', de.guide.notWorking, () => setNotWorking(true));
      }
    } else {
      reply('hilfe', de.result.helpInstead, escalate);
    }
  } else if (canGuide) {
    // Ein verworfenes Ergebnis („Passt nicht“) bietet seine Anleitung nicht mehr an
    const d = diagnoses.findLast((x) => x.source === 'fehlererkennung' && !x.discardedAt);
    const guide = d?.guideId ? getGuide(d.guideId) : undefined;
    if (d?.errorPattern === 'geraet_erkannt') {
      reply('foto', de.result.photoDisplay, () => router.push(`/fall/${caseId}/kamera`));
    } else if (guide && hasGuides(device)) {
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

  // Gekauft beim Händler: Den Fall kannst du ihm senden, sobald Hilfe nötig ist (Entscheidung 28).
  // Wann, sagt die Regel an_haendler_senden in model/policies/actions.ts. Beim Kosten-Schritt steht
  // das Angebot schon oben, dann nicht noch einmal.
  if (
    dealerOffer &&
    dealer &&
    !dealerConfirm &&
    !dealerQuestion &&
    !replies.some((r) => r.key === 'haendler')
  ) {
    reply(
      'haendler',
      de.sharing.offer(dealer.name),
      () => setDealerConfirm(true),
      de.sharing.offerSub(dealerName),
    );
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
  // Laufende Anleitung: Der Platzhalter lädt zur Frage zum aktuellen Schritt ein (statt eines Links)
  const stepNow = can(facts, 'anleitung_fortsetzen') && run ? run.currentStep + 1 : 0;
  const toDealer = recipient === 'haendler';
  const choice = { assistantFull: assistant.full, photoFor: attached?.an };
  // Ohne Händler und mit vollem Gespräch gibt es kein Eingabefeld mehr (R-11)
  const inputBar =
    closed ||
    !chatInputOpen({ dealerShared: dealerWritable, assistantFull: assistant.full }) ? undefined : (
      <ChatInput
        label={toDealer ? de.sharing.placeholderDealer(dealerName) : t.inputLabel}
        placeholder={
          toDealer
            ? de.sharing.placeholderDealer(dealerName)
            : stepNow
              ? de.chat.placeholderStep(stepNow)
              : de.chat.placeholder
        }
        value={input}
        error={inputError}
        onChangeText={(v) => {
          setInput(v);
          setInputError(undefined);
        }}
        onSend={sendInput}
        sendLabel={de.chat.send}
        canSend={(!!input.trim() || !!photoToSend) && (toDealer || !assistant.pending)}
        camera={{
          label: toDealer ? de.sharing.photoButtonDealer(dealerName) : de.chat.photoButton,
          disabled: !toDealer && assistant.pending,
          onPress: () => router.push(`/fall/${caseId}/foto-frage${toDealer ? '?an=haendler' : ''}`),
        }}
        // An den Assistenten oder an den Händler (Entscheidung 32). Ist das Gespräch mit dem
        // Assistenten voll, bleibt nur der Händler. Mit Foto bleibt nur sein Empfänger.
        recipient={
          dealerWritable
            ? {
                accessibilityLabel: de.sharing.recipient,
                value: recipient,
                options: [
                  {
                    value: 'assistent',
                    label: de.sharing.toAssistant,
                    disabled: !recipientSelectable(choice, 'assistent'),
                  },
                  {
                    value: 'haendler',
                    label: dealerName,
                    disabled: !recipientSelectable(choice, 'haendler'),
                  },
                ],
                onChange: setRecipientPick,
              }
            : undefined
        }
        above={
          attachedPhoto ? (
            <View style={styles.attached}>
              {/* Mit Foto gibt es keinen Umschalter. Für den Händler nennt die Zeile ihn (Prüfung 1.1). */}
              <Text variant="meta" style={styles.attachedText}>
                {toDealer
                  ? de.common.dot(de.chat.photoAttached, de.sharing.sentTo(dealerName))
                  : de.chat.photoAttached}
              </Text>
              <Button
                label={de.chat.photoRemove}
                variant="link"
                onPress={() => setAttached(undefined)}
              />
            </View>
          ) : undefined
        }
      />
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
      <Sheet
        visible={notWorking}
        onClose={() => setNotWorking(false)}
        title={de.guide.notWorkingTitle}
      >
        <TextField
          label={de.guide.noteLabel}
          placeholder={de.guide.notePlaceholder}
          multiline
          rows={3}
          value={note}
          onChangeText={setNote}
        />
        <Button
          label={de.guide.getHelp}
          size="lg"
          fullWidth
          onPress={() => finishGuide('geht_nicht', note)}
        />
      </Sheet>
      <AssistantConsentSheet
        visible={consentSheet && !!assistant.waiting}
        onAccept={acceptAssistant}
        onDecline={declineAssistant}
        onClose={() => setConsentSheet(false)}
      />
      <CallbackSheet
        caseId={caseId}
        slot={callbackSlot}
        onClose={() => setCallbackSlot(undefined)}
      />
      <CloseCaseSheet
        caseId={caseId}
        visible={cancelSheet}
        startCancelling
        onClose={() => setCancelSheet(false)}
      />
    </CaseScreen>
  );
}

const styles = StyleSheet.create({
  full: { alignSelf: 'stretch' },
  stack: { gap: 8 },
  items: { marginTop: 8, gap: 2 },
  gapTop: { marginTop: 8 },
  links: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16 },
  attached: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  attachedText: { flexShrink: 1 },
  toast: { marginHorizontal: 16, marginBottom: 8 },
});
