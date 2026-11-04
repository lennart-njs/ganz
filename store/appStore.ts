// Zustand der App, mit persist auf AsyncStorage. Ein offener Fall übersteht den Neustart (B-03).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, type StateStorage } from 'zustand/middleware';

import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';
import { caseAppliance, caseCategory, findingPattern } from '@/lib/appliance';
import { getGuide, registerCatalogEntry } from '@/lib/guideCatalog';
import { caseNames, textStamp, type LegalTextKey } from '@/lib/legalTexts';
import { caseService, insurerName } from '@/lib/service';
import { deleteInstallationId } from '@/services/installation';
import { notifications } from '@/services/notifications';
import {
  canStartVideoCall,
  canTransition,
  createQuote,
  findActiveConsent,
  isClosed,
  pauseCase as pause,
  resumeCase as resume,
  tryApplyCommand,
  type CaseCommand,
  type CommandContext,
  type CommandResult,
} from '@/model/caseMachine';
import { can } from '@/model/policies/actions';
import {
  booked,
  bookingsToCancel,
  cancelMayCost,
  isOrdered,
  planBooking,
} from '@/model/policies/bookingRules';
import { selectCaseFacts, type BindingReason, type HoldPurpose } from '@/model/policies/caseFacts';
import { scopedConsent } from '@/model/policies/consentScopes';
import {
  isEmptyCase,
  planOpenCase,
  type OpenCaseArt,
  type OpenCaseOptions,
} from '@/model/policies/openCase';
import { amountDue, bookingCosts } from '@/model/policies/payer';
import { closeRound, currentBookings } from '@/model/policies/rounds';
import { addMonths, checkWarranty } from '@/model/policies/warranty';
import { ok, refuse, type Refused, type Result } from '@/model/result';
import type {
  Booking,
  Cents,
  Case,
  CaseEntry,
  CaseEvent,
  ChatMessage,
  Consent,
  ConsentPurpose,
  Contract,
  Device,
  Diagnosis,
  GuideCatalogEntry,
  GuideRun,
  Household,
  Id,
  Person,
  Photo,
  Quote,
  VideoSession,
} from '@/model/types';

import { contractFromConfig, dealerRef, demoStartData, type DemoStartKind } from './demoStart';
import { defaultEnv, type StoreEnv } from './env';
import {
  createLoadState,
  createSafeStorage,
  migrateStoredState,
  STORE_KEY,
  STORE_VERSION,
} from './persistence';
import { parseStoredState } from './storedState';

export { STORE_KEY, STORE_VERSION } from './persistence';

/** Einstellungen für Pitch und Tests. Steuerung im Profil (Schritt 13). */
export interface DemoSettings {
  /** Schließbare Tipps und Kennzeichnung „Beispielwerte“ */
  hints: boolean;
  scanScenario: 'erkannt' | 'nicht_erkannt';
  diagnosisScenario: 'standard' | 'unsicher' | 'unscharf';
  videoScenario: 'verbunden' | 'keine_fachkraft';
  claimScenario: 'freigeben' | 'ablehnen';
  /** Selbstbeteiligung im Pitch, Standard aus der Konfiguration */
  deductible: Cents;
  /**
   * „Reparatur liegt länger zurück“: Die Prüfung nach „Problem besteht weiter“ tut so, als wäre die
   * Gewährleistung schon vorbei (Nr. 32). So zeigt der Pitch beide Wege. Kein Datum wird geändert.
   */
  repairLongAgo: boolean;
  /** Geschlossene Tipps */
  dismissedHints: string[];
}

export const defaultDemoSettings: DemoSettings = {
  hints: demoConfig.demo.hints,
  scanScenario: 'erkannt',
  diagnosisScenario: 'standard',
  videoScenario: 'verbunden',
  claimScenario: 'freigeben',
  deductible: demoConfig.contract.deductible,
  repairLongAgo: false,
  dismissedHints: [],
};

export type NewDevice = Omit<Device, 'id' | 'householdId' | 'createdAt'>;

export type NotificationSetting = 'offen' | 'erlaubt' | 'abgelehnt';

/**
 * Welcher Text vor der Einwilligung in Mitteilungen stand: das Kästchen im Profil oder der Satz
 * vor „Termin anfragen“, nach dem das System fragt. Die Einwilligung speichert genau diesen Text.
 */
export type NotificationsText = Extract<LegalTextKey, 'mitteilungen' | 'mitteilungen_termin'>;

/**
 * Empfänger der Einwilligung in Mitteilungen: mach’s selbst als Absender. Lokale Mitteilungen
 * verlassen das Telefon nicht. PartnerKind kennt die App selbst noch nicht, Phase 3 fasst
 * Empfänger neu. Die id 'ganz' bleibt als interner Schlüssel (docs/ANNAHMEN.md, Übertragung).
 */
const NOTIFICATIONS_RECIPIENT = { id: 'ganz', kind: 'dienstleister', name: de.app.name } as const;

/** Der Text, den du vor der Weitergabe siehst, beim ersten Mal und beim erneuten Bestätigen */
export const TRANSFER_TEXT: Record<HoldPurpose, LegalTextKey> = {
  weitergabe_versicherer: 'schadenmeldung',
  weitergabe_betrieb: 'termin_betrieb',
};

/** Darstellung: folgt dem System oder ist fest hell oder dunkel */
export type Appearance = 'system' | 'hell' | 'dunkel';

export interface AppData {
  onboardingDone: boolean;
  appearance: Appearance;
  demo: DemoSettings;
  /** Lokale Mitteilungen: erst nach dem Systemdialog, der nach „Termin anfragen“ kommt */
  notifications: NotificationSetting;
  household?: Household;
  persons: Person[];
  contracts: Contract[];
  devices: Device[];
  cases: Record<Id, Case>;
  events: CaseEvent[];
  photos: Photo[];
  diagnoses: Diagnosis[];
  guideRuns: Record<Id, GuideRun>;
  consents: Consent[];
  quotes: Quote[];
  bookings: Booking[];
  videoSessions: VideoSession[];
  /** Gespräche mit dem Reparatur-Assistenten, je Fall */
  chatMessages: ChatMessage[];
  /** Freigegebene Katalog-Einträge vom Server (Entscheidung 24). Der Demo-Eintrag ist eingebaut. */
  guideCatalog: GuideCatalogEntry[];
  /** Fälle, die an den Händler gesendet wurden (Entscheidung 28), je Fall */
  shares: Record<Id, CaseShare>;
  nextCaseNumber: number;
}

export interface CaseShare {
  consentId: Id;
  /** Vom Backend beim ersten Senden. Nur damit darf die App den Fall ändern oder widerrufen. */
  token?: string;
  /** Zuletzt gesendeter Stand: Zahl der Ereignisse im Fall */
  syncedEvents?: number;
  /** Letztes Ereignis des Händlers, das schon im Fall ist */
  retailerSince?: string;
  revoked?: boolean;
}

export interface CommandOptions extends Omit<
  CommandContext,
  'now' | 'newId' | 'consents' | 'actor'
> {
  actor?: CaseEvent['actor'];
}

export type NewConsent = Omit<Consent, 'id' | 'grantedAt' | 'personId'>;

/** Ergebnis von openCaseFor: was passiert ist und um welchen Fall es geht */
export interface OpenCaseResult {
  art: OpenCaseArt;
  caseId: Id;
}

export interface AppActions {
  /** Legt Haushalt und Person beim ersten Start an. Idempotent. */
  ensureHousehold: () => Person;
  completeOnboarding: () => void;
  /** Freigegebenen Katalog-Eintrag aufnehmen. Entwürfe werden ignoriert. */
  addCatalogEntry: (entry: GuideCatalogEntry) => void;
  /**
   * Fall an den Händler: Bestätigung speichern (lit. b). Senden übernimmt useShareSync. Nur, wo die
   * Regel an_haendler_senden es erlaubt, sonst eine Ablehnung ohne Schreiben.
   */
  shareWithDealer: (caseId: Id, textVersion: string) => Result<Consent>;
  updateShare: (caseId: Id, patch: Partial<CaseShare>) => void;
  /** Ereignisse des Händlers aus dem Backend in den Fall übernehmen, ohne Doppelte */
  importRetailerEvents: (caseId: Id, events: CaseEvent[]) => void;
  /**
   * Nachricht an den Händler (Entscheidung 32). Nur, wo die Regel haendler_schreiben es erlaubt
   * und die Weitergabe noch läuft, sonst eine Ablehnung ohne Schreiben.
   */
  messageDealer: (caseId: Id, text: string, photoId?: Id) => Result<CaseEvent>;
  /** Legt den Vertrag aus der Konfiguration an (nach erfolgreicher Prüfung). */
  linkContract: (via: Contract['linkedVia']) => Contract;
  addDevice: (input: NewDevice) => Device;
  /** Versicherung zum Gerät: Versicherer aus der Liste und Police-Nr. (Entscheidung 16) */
  linkPolicy: (input: { deviceId: Id; insurerId: string; policyNumber: string }) => Contract;
  /** Ohne Versicherung: Händler, bei dem das Gerät gekauft wurde. undefined: weiß ich nicht. */
  setDeviceDealer: (deviceId: Id, dealerId: string | undefined) => void;
  setDemo: (patch: Partial<DemoSettings>) => void;
  /**
   * Legt einen Fall an, ohne nach einem offenen Fall zu fragen. In der App ruft das nur
   * openCaseFor auf, ein Test prüft das. Tests bauen damit Ausgangslagen.
   */
  createCase: (input: { deviceId: Id; entry: CaseEntry; problemLabel: string }) => Case;
  /**
   * Der eine Weg, einen Fall zu öffnen (Entscheidung Nr. 13, model/policies/openCase.ts):
   * 'neu' legt einen Fall an, nach „Neues Problem melden“ erst nach dem Abbruch des laufenden.
   * 'ersetzt' gibt dem offenen Fall ohne Fortschritt das neue Problem, eine offene Anleitung
   * bleibt nur mit options.guideId derselben Anleitung. 'frage_weitermachen'
   * ändert nichts, mach’s fragt dann „Weitermachen“ oder „Neues Problem melden“.
   */
  openCaseFor: (
    deviceId: Id,
    entry: CaseEntry,
    problemLabel: string,
    options?: OpenCaseOptions,
  ) => Result<OpenCaseResult>;
  /**
   * Befehl der Status-Maschine. Erst die Prüfung, dann Fall und Ereignisse in einem set.
   * Verbotene Übergänge und fehlende Bestätigungen lehnt es ab, statt zu werfen.
   */
  runCommand: (caseId: Id, command: CaseCommand, options?: CommandOptions) => Result<Case>;
  /** Ändert Einstieg oder Bezeichnung eines Falls, solange er offen ist */
  updateCase: (caseId: Id, patch: Partial<Pick<Case, 'entry' | 'problemLabel'>>) => void;
  /** Entfernt einen Fall ohne Inhalt, siehe isEmptyCase in model/policies/openCase.ts */
  discardIfEmpty: (caseId: Id) => void;
  setAppearance: (appearance: Appearance) => void;
  /** Nachricht im Chat. Eine Frage des Haushalts kommt als Ereignis in die Fallakte. */
  addChatMessage: (input: Omit<ChatMessage, 'id' | 'at'>) => ChatMessage;
  /**
   * Hält fest, ob eigene Nachrichten an den Anbieter des Assistenten gingen (ChatMessage.forwarded).
   * false ändert keine Nachricht, die schon als weitergegeben gilt.
   */
  markChatForwarded: (messageIds: readonly Id[], forwarded: boolean) => void;
  addDiagnosis: (input: Omit<Diagnosis, 'id' | 'createdAt'>) => Result<Diagnosis>;
  /** Foto aus der App-Kamera: Zeitstempel, Gerät, Zweck und Fall (B-16) */
  addPhoto: (input: Omit<Photo, 'id' | 'takenAt'>) => Photo;
  /**
   * Startet eine Anleitung. Aus „offen“ wechselt der Fall in die Selbsthilfe. Läuft dieselbe
   * Anleitung schon, geht sie weiter. Eine andere offene Anleitung des Falls endet. Eine neue
   * Anleitung nur, wo die Regel anleitung_starten es erlaubt. Alles in einem set.
   */
  startGuide: (caseId: Id, guideId: string) => Result<GuideRun>;
  /** Hilfe holen, wenn der Status es erlaubt. Sonst abgelehnt, ohne Wirkung. */
  escalate: (caseId: Id) => Result<Case>;
  /**
   * Fragt einen Videocall an, wo die Regeln es erlauben, und holt dabei Hilfe. Nur mit
   * bestätigter Weitergabe an die Fachkraft (B-19): schon gespeichert oder als confirm.share mit
   * dem Tap. Bestätigungen, Status, Call und Ereignisse stehen in einem set.
   */
  requestVideoCall: (
    caseId: Id,
    confirm?: { share?: NewConsent; screenshots?: NewConsent },
  ) => Result<VideoSession>;
  /** Ergebnis des Warteraums oder Ende des Calls. Verbinden nur mit gültiger Bestätigung. */
  updateVideoCall: (
    sessionId: Id,
    change: 'verbunden' | 'keine_fachkraft' | 'abgebrochen' | 'beendet',
  ) => Result<VideoSession>;
  /**
   * Rückruf der Fachkraft. Nur mit bestätigter Weitergabe an die Fachkraft (R-16): schon
   * gespeichert oder als confirm mit dem Tap im Sheet, dann in einem set mit dem Rückruf.
   */
  requestCallback: (caseId: Id, slot: string, confirm?: NewConsent) => Result<void>;
  /**
   * Meldet den Schadenfall: speichert die Bestätigung und wechselt auf „freigabe_noetig“ (B-17).
   * Erst die Regel, dann Bestätigung, Meldung und Status in einem set. Ohne Vertrag oder nach
   * der Meldung abgelehnt. Version und Hash des Hinweistexts kommen aus lib/legalTexts.ts
   * (schadenmeldung): Kosten und Gespräch zeigen beide diesen Text.
   */
  reportClaim: (caseId: Id) => Result<Case>;
  /**
   * Termin anfragen. Die Pumpe geht nie an den Haushalt (B-28). Erst die Prüfung, dann Status,
   * Bestätigung, Termin und Ereignisse in einem set.
   */
  requestBooking: (input: {
    caseId: Id;
    kind: Booking['kind'];
    partnerId: string;
    slotLabel: string;
    selfPay: boolean;
    partName?: string;
  }) => Result<Booking>;
  /**
   * „Zahlungspflichtig buchen“ im eigenen Schritt nach der unverbindlichen Anfrage (Entscheidung
   * Nr. 31): nur wo die Regel zahlungspflichtig_buchen gilt, mit gültiger Weitergabe an genau den
   * gebuchten Betrieb und mit dem Betrag, den du gesehen hast (shown). Das Ereignis
   * zahlungspflichtig_gebucht hält Text und Betrag fest. Erst danach bestätigt der Betrieb.
   */
  bookBinding: (caseId: Id, shown: Cents) => Result<Booking>;
  /**
   * „Nicht buchen“ statt „Zahlungspflichtig buchen“ (Entscheidung Nr. 33, nach der Freigabe
   * genauso): Die unverbindliche Anfrage endet ohne Kosten, der Termin ist storniert, und der Fall
   * bietet wieder, was er vorher bot. Nur wo die Regel nicht_buchen gilt. Ein set.
   */
  declineBinding: (caseId: Id) => Result<Booking>;
  /**
   * Antwort auf den Systemdialog oder den Schalter im Profil. „erlaubt“ speichert die Einwilligung
   * 'mitteilungen' (lit. a), alles andere widerruft sie (R-13).
   */
  setNotifications: (value: NotificationSetting, shown?: NotificationsText) => void;
  /**
   * Nächster Schritt der Simulation: Freigabe, Bestätigung, unterwegs, repariert (BUILD_PLAN 5.1).
   * Ohne gültige Weitergabe für den Schritt passiert nichts, siehe simulationHold.
   */
  simulateNext: (caseId: Id) => boolean;
  /**
   * Abschluss nach der Reparatur: „Läuft wieder“ oder „Problem besteht weiter“, nach den Regeln.
   * „Problem besteht weiter“ prüft die Gewährleistung (Nr. 32, checkWarranty): Läuft sie noch,
   * bessert derselbe Betrieb nach, in einer markierten Runde ohne Schadenfall und ohne Kosten.
   * Sonst beginnt eine neue Runde wie bisher. Ein set.
   */
  confirmRepair: (caseId: Id, works: boolean) => Result<Case>;
  /**
   * Termin für die Nachbesserung (Nr. 32): beim Betrieb der Reparatur, ohne Betrag, ohne
   * „Zahlungspflichtig buchen“. Nur wo die Regel nachbesserung_anfragen gilt und mit gültiger
   * Weitergabe an genau diesen Betrieb. Eine neue Bestätigung entsteht dabei nicht.
   */
  requestRework: (caseId: Id, slotLabel: string) => Result<Booking>;
  rateBooking: (bookingId: Id, stars: 1 | 2 | 3 | 4 | 5) => void;
  /** Befund der Fachkraft oder des Betriebs, bei Reparatur mit Kostenvoranschlag. Ein set. */
  setFinding: (
    caseId: Id,
    option: 'geloest' | 'reparatur' | 'ersatzgeraet',
    by: 'fachkraft' | 'betrieb',
  ) => Result<Case>;
  /** Schritt erledigt oder Schritt zurück. Der Fortschritt bleibt gespeichert (B-05). */
  moveGuideStep: (runId: Id, direction: 'next' | 'back') => void;
  /** Sicherheitshinweis bestätigt, z. B. „Der Wasserhahn ist zu“ (Q-13) */
  confirmSafety: (runId: Id, step: number) => void;
  /**
   * Beendet die Anleitung. „Geht nicht“ speichert den Abbruchschritt und die Notiz (B-06).
   * Gelöst wird der Fall erledigt, sonst holt er Hilfe. Anleitung und Status in einem set.
   */
  finishGuide: (
    runId: Id,
    outcome: NonNullable<GuideRun['outcome']>,
    note?: string,
  ) => Result<GuideRun>;
  /** „Später weitermachen“, solange der Fall nicht abgeschlossen ist */
  pauseCase: (caseId: Id) => Result<Case>;
  resumeCase: (caseId: Id) => Result<Case>;
  grantConsent: (input: NewConsent) => Consent;
  revokeConsent: (consentId: Id) => void;
  /**
   * Nach einem Widerruf: Bestätigt die Weitergabe, ohne die der Fall anhält (R-12), noch einmal.
   * Empfänger, Umfang und Text wie beim ersten Mal. Nur auf einen Tap, nur solange der Fall hält.
   */
  renewTransfer: (caseId: Id) => Result<Consent>;
  addEvent: (event: Omit<CaseEvent, 'id' | 'at'>) => CaseEvent;
  /** Nur Demo: alles auf den Anfang */
  reset: () => void;
  /**
   * Demo-Steuerung: ein fester Startstand für den Pitch, siehe store/demoStart.ts. Ohne Angabe
   * der Stand für die Demo mit dem Händler, 'versicherung' der mit Schutz bei Kranich.
   */
  loadDemoStart: (kind?: DemoStartKind) => void;
}

export type AppState = AppData & AppActions;

export const initialData: AppData = {
  onboardingDone: false,
  appearance: 'system',
  demo: defaultDemoSettings,
  notifications: 'offen',
  persons: [],
  contracts: [],
  devices: [],
  cases: {},
  events: [],
  photos: [],
  diagnoses: [],
  guideRuns: {},
  consents: [],
  quotes: [],
  bookings: [],
  videoSessions: [],
  chatMessages: [],
  guideCatalog: [],
  shares: {},
  nextCaseNumber: demoConfig.caseNumber.start,
};

export function createAppStore(storage: StateStorage = AsyncStorage, env: StoreEnv = defaultEnv) {
  const safeStorage = createSafeStorage(storage, env.now);
  const loading = createLoadState();
  const store = create<AppState>()(
    persist(
      (set, get) => {
        const person = (): Person => get().ensureHousehold();
        const householdActor = (): CaseEvent['actor'] => ({ kind: 'haushalt', id: person().id });

        const commit = (result: CommandResult) =>
          set((s) => ({
            cases: { ...s.cases, [result.case.id]: result.case },
            events: [...s.events, ...result.events],
          }));

        /** Ablehnung für eine Fallnummer, die es nicht gibt */
        const missingCase = (caseId: Id): Refused =>
          refuse({ code: 'unbekannt', what: 'fall', id: caseId });

        /**
         * Eine Bestätigung für Videocall oder Rückruf gilt nur, wenn sie den Betrieb der Fachkraft
         * nennt, die den Fall übernimmt (lib/service.ts): beim Händler-Gerät sein Kundendienst.
         */
        const namesExpert = (caseId: Id, ...confirms: (NewConsent | undefined)[]) => {
          const partnerId = caseService(get(), caseId).expert.partner.id;
          return confirms.every((k) => !k || k.recipient.id === partnerId);
        };

        /** Rechnet einen Befehl aus, ohne zu schreiben. Schreiben: commit. */
        const draftCommand = (
          c: Case,
          command: CaseCommand,
          options: CommandOptions = {},
          consents: readonly Consent[] = get().consents,
        ): Result<CommandResult> =>
          tryApplyCommand(c, command, {
            ...options,
            actor: options.actor ?? householdActor(),
            now: env.now(),
            newId: env.newId,
            consents,
          });

        /** Baut eine Bestätigung mit ihrem Ereignis in der Fallakte, ohne zu schreiben */
        const draftConsent = (input: NewConsent): { consent: Consent; events: CaseEvent[] } => {
          const p = person();
          const consent: Consent = {
            ...input,
            id: env.newId('consent'),
            personId: p.id,
            grantedAt: env.now(),
          };
          const events: CaseEvent[] = consent.caseId
            ? [
                {
                  id: env.newId('ev'),
                  caseId: consent.caseId,
                  type: 'weitergabe_bestaetigt',
                  at: consent.grantedAt,
                  actor: { kind: 'haushalt', id: p.id },
                  payload: {
                    purpose: consent.purpose,
                    recipient: consent.recipient.name,
                    legalBasis: consent.legalBasis,
                  },
                },
              ]
            : [];
          return { consent, events };
        };

        /** Anleitungen des Falls, die noch laufen */
        const openRuns = (caseId: Id): GuideRun[] =>
          (get().cases[caseId]?.guideRunIds ?? [])
            .map((id) => get().guideRuns[id])
            .filter((r): r is GuideRun => !!r && !r.endedAt);

        /**
         * Beendet Anleitungen, weil es mit einem anderen Problem weitergeht. Ohne Ergebnis
         * (outcome), erledigte Schritte bleiben. Ohne Schritt zählt das nicht als Fortschritt.
         * Rechnet nur, schreiben tut der Aufrufer.
         */
        const draftEndRuns = (runs: GuideRun[]) => {
          const now = env.now();
          return {
            guideRuns: Object.fromEntries(runs.map((r) => [r.id, { ...r, endedAt: now }])),
            events: runs.map((r): CaseEvent => ({
              id: env.newId('ev'),
              caseId: r.caseId,
              type: 'anleitung_beendet',
              at: now,
              actor: householdActor(),
              payload: {
                guideRunId: r.id,
                guideId: r.guideId,
                step: r.currentStep + 1,
                replaced: true,
              },
            })),
          };
        };

        /**
         * Ergebnisse der Fehlererkennung und eigene Angaben gelten nicht mehr, weil das Problem
         * des Falls wechselt. Befunde von Fachkraft und Betrieb bleiben.
         */
        const discardResults = (caseId: Id) => {
          const now = env.now();
          const stale = (d: Diagnosis) =>
            d.caseId === caseId &&
            !d.discardedAt &&
            (d.source === 'fehlererkennung' || d.source === 'nutzerangabe');
          if (!get().diagnoses.some(stale)) return;
          set((s) => ({
            diagnoses: s.diagnoses.map((d) => (stale(d) ? { ...d, discardedAt: now } : d)),
          }));
        };

        const endRuns = (runs: GuideRun[]) => {
          if (!runs.length) return;
          const ended = draftEndRuns(runs);
          set((s) => ({
            guideRuns: { ...s.guideRuns, ...ended.guideRuns },
            events: [...s.events, ...ended.events],
          }));
        };

        /**
         * Ein Ergebnis oder Befund am Fall, ohne zu schreiben. Das Ereignis ergebnis_erkannt gibt
         * es nur für die Fehlererkennung und eigene Angaben, Befunde haben befund_erstellt.
         */
        const draftDiagnosis = (c: Case, input: Omit<Diagnosis, 'id' | 'createdAt'>) => {
          const d: Diagnosis = { ...input, id: env.newId('ergebnis'), createdAt: env.now() };
          const ev: CaseEvent = {
            id: env.newId('ev'),
            caseId: c.id,
            type: 'ergebnis_erkannt',
            at: d.createdAt,
            actor: d.source === 'fehlererkennung' ? { kind: 'system' } : householdActor(),
            payload: {
              diagnosisId: d.id,
              mode: d.mode,
              errorPattern: d.errorPattern,
              confidence: d.confidence,
              source: d.source,
            },
          };
          const isResult = d.source === 'fehlererkennung' || d.source === 'nutzerangabe';
          return {
            diagnosis: d,
            case: { ...c, diagnosisIds: [...c.diagnosisIds, d.id], updatedAt: d.createdAt },
            events: isResult ? [ev] : [],
          };
        };

        /**
         * Der Tap auf „Zahlungspflichtig buchen“, ohne zu schreiben: der Termin mit binding und das
         * Ereignis mit Betrag, Betrieb, Zeitfenster und dem Stempel des gezeigten Texts. Gleich für
         * die Buchung mit bekanntem Preis und den Schritt nach der Freigabe (separateStep).
         */
        const draftBinding = (
          b: Booking,
          amount: Cents,
          reason: BindingReason,
          separateStep: boolean,
        ): { booking: Booking; event: CaseEvent } => {
          const at = env.now();
          const stamp = textStamp('verbindliche_buchung', {
            ...caseNames(get(), b.caseId),
            fachbetrieb: b.provider.name,
          });
          return {
            booking: { ...b, binding: { at, amount } },
            event: {
              id: env.newId('ev'),
              caseId: b.caseId,
              type: 'zahlungspflichtig_gebucht',
              at,
              actor: householdActor(),
              payload: {
                bookingId: b.id,
                kind: b.kind,
                partner: b.provider.name,
                slot: b.slotLabel,
                amount,
                reason,
                separateStep,
                ...stamp,
              },
            },
          };
        };

        /** Ein Ereignis in der Fallakte, ohne zu schreiben */
        const draftEvent = (input: Omit<CaseEvent, 'id' | 'at'>): CaseEvent => ({
          ...input,
          id: env.newId('ev'),
          at: env.now(),
        });

        /**
         * Die Absage an den Betrieb beim Abbrechen (Entscheidung Nr. 34), ohne zu schreiben: Jeder
         * Termin, der noch läuft, wird storniert, mit dem Ereignis termin_abgesagt. ordered sagt, ob
         * der Betrieb den Auftrag schon hatte. Dann klärt er mit dir, ob Kosten entstanden sind.
         * Weitergegeben wird nur die Absage, dafür reicht die Weitergabe, mit der er den Termin bekam.
         */
        const draftCancelBookings = (c: Case) => {
          const bookings = bookingsToCancel(c, get().bookings);
          const events = bookings.map((b) =>
            draftEvent({
              caseId: c.id,
              type: 'termin_abgesagt',
              actor: householdActor(),
              payload: {
                bookingId: b.id,
                kind: b.kind,
                partner: b.provider.name,
                slot: b.slotLabel,
                ordered: isOrdered(c, b),
                // Ob der Betrieb mit dir klärt, ob Kosten entstanden sind. Nicht bei der
                // Nachbesserung, dafür zahlst du nichts Neues (Nr. 32).
                costsOpen: cancelMayCost(c, b),
              },
            }),
          );
          return { bookings, events };
        };

        return {
          ...initialData,

          ensureHousehold: () => {
            const existing = get().persons[0];
            if (existing) return existing;
            const now = env.now();
            const p: Person = {
              id: env.newId('person'),
              displayName: demoConfig.household.displayName,
              role: 'versicherungsnehmer',
            };
            const household: Household = {
              id: env.newId('haushalt'),
              members: [p],
              address: { ...demoConfig.household.address },
              createdAt: now,
            };
            set({ persons: [p], household });
            return p;
          },

          completeOnboarding: () => set({ onboardingDone: true }),

          // Erst prüfen, dann in einem Schritt schreiben: Bestätigung, ihr Ereignis und die Weitergabe
          shareWithDealer: (caseId, textVersion) => {
            const c = get().cases[caseId];
            if (!c) return missingCase(caseId);
            const dealer = get().devices.find((d) => d.id === c.deviceId)?.soldBy;
            if (!dealer || !can(selectCaseFacts(get(), caseId), 'an_haendler_senden')) {
              return refuse({ code: 'regel', action: 'an_haendler_senden' });
            }
            const { consent, events } = draftConsent({
              caseId,
              purpose: 'weitergabe_haendler',
              legalBasis: 'vertrag',
              recipient: dealer,
              dataCategories: [...de.consentData.haendler],
              textVersion,
            });
            set((s) => ({
              consents: [...s.consents, consent],
              events: [...s.events, ...events],
              shares: { ...s.shares, [caseId]: { consentId: consent.id } },
            }));
            return ok(consent);
          },

          updateShare: (caseId, patch) =>
            set((s) => {
              const current = s.shares[caseId];
              if (!current) return {};
              return { shares: { ...s.shares, [caseId]: { ...current, ...patch } } };
            }),

          importRetailerEvents: (caseId, incoming) =>
            set((s) => {
              if (!s.cases[caseId]) return {};
              const known = new Set(s.events.map((e) => e.id));
              // Nur Ereignisse des Händlers, nur für diesen Fall
              const fresh = incoming.filter(
                (e) =>
                  e.caseId === caseId &&
                  e.actor?.kind === 'haendler' &&
                  e.type.startsWith('haendler_') &&
                  !known.has(e.id),
              );
              if (!fresh.length) return {};
              const since = fresh
                .map((e) => e.at)
                .sort()
                .at(-1);
              const share = s.shares[caseId];
              return {
                events: [...s.events, ...fresh],
                shares: share
                  ? { ...s.shares, [caseId]: { ...share, retailerSince: since } }
                  : s.shares,
              };
            }),

          messageDealer: (caseId, text, photoId) => {
            const s = get();
            if (!s.cases[caseId]) return missingCase(caseId);
            const clean = text.trim().slice(0, 2000);
            if (!clean || !can(selectCaseFacts(s, caseId), 'haendler_schreiben')) {
              return refuse({ code: 'regel', action: 'haendler_schreiben' });
            }
            // Die Weitergabe, mit der der Fall beim Händler ist, läuft noch (useShareSync)
            const share = s.shares[caseId];
            const consent = s.consents.find((k) => k.id === share?.consentId);
            if (!share || share.revoked || !consent || consent.revokedAt) {
              return refuse({ code: 'bestaetigung', purpose: 'weitergabe_haendler' });
            }
            return ok(
              get().addEvent({
                caseId,
                type: 'nachricht_an_haendler',
                actor: { kind: 'haushalt', id: s.persons[0]?.id },
                payload: { text: clean, ...(photoId ? { photoId } : {}) },
              }),
            );
          },

          addCatalogEntry: (entry) => {
            if (!registerCatalogEntry(entry)) return;
            set((s) => ({
              guideCatalog: [...s.guideCatalog.filter((e) => e.id !== entry.id), entry],
            }));
          },

          linkContract: (via) => {
            const p = person();
            const cfg = demoConfig;
            // Geräte aus dem Vertrag, die schon in der App sind, gehören dazu.
            const covered = get().devices.filter(
              (d) => d.manufacturerId === cfg.manufacturer.id && d.model === cfg.device.model,
            );
            const contract = contractFromConfig({
              id: env.newId('vertrag'),
              householdId: get().household?.id ?? '',
              policyholderId: p.id,
              deductible: get().demo.deductible,
              linkedVia: via,
              linkedAt: env.now(),
              coveredDeviceIds: covered.map((d) => d.id),
            });
            set((s) => ({
              contracts: [contract],
              devices: s.devices.map((d) =>
                covered.includes(d) ? { ...d, contractId: contract.id } : d,
              ),
            }));
            return contract;
          },

          addDevice: (input) => {
            person();
            const device: Device = {
              ...input,
              id: env.newId('geraet'),
              householdId: get().household?.id ?? '',
              createdAt: env.now(),
            };
            set((s) => ({
              devices: [...s.devices, device],
              contracts: s.contracts.map((c) =>
                c.id === device.contractId
                  ? { ...c, coveredDeviceIds: [...c.coveredDeviceIds, device.id] }
                  : c,
              ),
            }));
            return device;
          },

          linkPolicy: ({ deviceId, insurerId, policyNumber }) => {
            const p = person();
            const now = env.now();
            const cfg = demoConfig;
            const isDemoInsurer = insurerId === cfg.insurer.id;
            const insurer = isDemoInsurer
              ? cfg.insurer
              : (cfg.insurers.find((i) => i.id === insurerId) ?? cfg.insurer);
            const contract: Contract = {
              id: env.newId('vertrag'),
              householdId: get().household?.id ?? '',
              kind: isDemoInsurer ? cfg.contract.kind : 'geraeteversicherung',
              provider: { id: insurer.id, kind: 'versicherer', name: insurer.name },
              productName: isDemoInsurer ? cfg.contract.productName : de.coverage.productDefault,
              contractNumber: policyNumber.trim(),
              policyholderId: p.id,
              validFrom: cfg.contract.validFrom,
              validUntil: cfg.contract.validUntil,
              deductible: get().demo.deductible,
              coveredDeviceIds: [deviceId],
              linkedVia: 'vertragsnummer',
              linkedAt: now,
            };
            set((s) => ({
              contracts: [...s.contracts, contract],
              devices: s.devices.map((d) =>
                d.id === deviceId ? { ...d, contractId: contract.id } : d,
              ),
            }));
            return contract;
          },

          setDeviceDealer: (deviceId, dealerId) => {
            const soldBy = dealerRef(dealerId);
            set((s) => ({
              devices: s.devices.map((d) => (d.id === deviceId ? { ...d, soldBy } : d)),
            }));
          },

          setDemo: (patch) =>
            set((s) => ({
              demo: {
                ...s.demo,
                ...patch,
                // Hinweise wieder an: auch geschlossene Tipps kommen zurück
                dismissedHints: patch.hints ? [] : (patch.dismissedHints ?? s.demo.dismissedHints),
              },
              // Der Vertrag zeigt dieselbe Selbstbeteiligung wie die Demo-Einstellung
              contracts:
                patch.deductible === undefined
                  ? s.contracts
                  : s.contracts.map((c) => ({ ...c, deductible: patch.deductible! })),
            })),

          createCase: ({ deviceId, entry, problemLabel }) => {
            const p = person();
            const now = env.now();
            const number = get().nextCaseNumber;
            const c: Case = {
              id: `${demoConfig.caseNumber.prefix}${number}`,
              householdId: get().household?.id ?? '',
              deviceId,
              reportedBy: p.id,
              status: 'offen',
              entry,
              problemLabel,
              diagnosisIds: [],
              guideRunIds: [],
              photoIds: [],
              createdAt: now,
              updatedAt: now,
            };
            const ev: CaseEvent = {
              id: env.newId('ev'),
              caseId: c.id,
              type: 'fall_angelegt',
              at: now,
              actor: { kind: 'haushalt', id: p.id },
              payload: { entry, problemLabel },
            };
            set((s) => ({
              cases: { ...s.cases, [c.id]: c },
              events: [...s.events, ev],
              nextCaseNumber: number + 1,
            }));
            return c;
          },

          openCaseFor: (deviceId, entry, problemLabel, options = {}) => {
            const plan = planOpenCase(get(), deviceId, options);
            if (plan.art === 'frage_weitermachen')
              return ok({ art: plan.art, caseId: plan.caseId });
            if (plan.art === 'ersetzt') {
              // Der neue Versuch geht im selben Fall weiter, auch nach „Später weitermachen“
              if (get().cases[plan.caseId]?.pausedAt) get().resumeCase(plan.caseId);
              // Eine offene Anleitung bleibt nur, wenn es mit ihr weitergeht (R-06)
              endRuns(openRuns(plan.caseId).filter((r) => r.guideId !== options.guideId));
              // Das bisherige Ergebnis gehört zum alten Problem, etwa nach „Passt nicht“
              discardResults(plan.caseId);
              get().updateCase(plan.caseId, { entry, problemLabel });
              return ok({ art: plan.art, caseId: plan.caseId });
            }
            // Erst den laufenden Fall abbrechen. Geht das nicht, entsteht auch kein neuer.
            if (plan.cancel) {
              const cancelled = get().runCommand(plan.cancel, 'abbrechen', {
                cancelReason: de.thread.newProblemReason,
              });
              if (!cancelled.ok) return cancelled;
            }
            return ok({
              art: plan.art,
              caseId: get().createCase({ deviceId, entry, problemLabel }).id,
            });
          },

          runCommand: (caseId, command, options = {}) => {
            const c = get().cases[caseId];
            if (!c) return missingCase(caseId);
            const result = draftCommand(c, command, options);
            if (!result.ok) return result;
            // Abbrechen nur, wo auch die Regel es erlaubt, wie im Sheet: nicht mehr, wenn der
            // Betrieb mit der Reparatur fertig ist (Nr. 34, Nr. 32)
            if (command === 'abbrechen' && !can(selectCaseFacts(get(), caseId), 'abbrechen')) {
              return refuse({ code: 'regel', action: 'abbrechen' });
            }
            // Mit dem Abbruch bekommt der Betrieb die Absage (Nr. 34). Danach läuft kein Termin
            // mehr, und die Simulation hat keinen Schritt mehr.
            const cancelled = command === 'abbrechen' ? draftCancelBookings(c) : undefined;
            if (!cancelled?.bookings.length) {
              commit(result.value);
              return ok(result.value.case);
            }
            const ids = cancelled.bookings.map((b) => b.id);
            set((s) => ({
              cases: { ...s.cases, [caseId]: result.value.case },
              bookings: s.bookings.map((b) =>
                ids.includes(b.id) ? { ...b, status: 'storniert' as const } : b,
              ),
              events: [...s.events, ...result.value.events, ...cancelled.events],
            }));
            return ok(result.value.case);
          },

          updateCase: (caseId, patch) =>
            set((s) => {
              const c = s.cases[caseId];
              // Nur solange der Fall noch am Anfang steht: gemeldet oder in der Selbsthilfe
              if (!c || (c.status !== 'offen' && c.status !== 'selbsthilfe')) return {};
              return { cases: { ...s.cases, [caseId]: { ...c, ...patch, updatedAt: env.now() } } };
            }),

          setAppearance: (appearance) => set({ appearance }),

          discardIfEmpty: (caseId) =>
            set((s) => {
              const c = s.cases[caseId];
              if (!c || !isEmptyCase(s, c)) return {};
              const { [caseId]: _removed, ...cases } = s.cases;
              return { cases, events: s.events.filter((e) => e.caseId !== caseId) };
            }),

          markChatForwarded: (messageIds, forwarded) =>
            set((s) => ({
              chatMessages: s.chatMessages.map((m) =>
                messageIds.includes(m.id) && m.role === 'haushalt' && m.forwarded !== true
                  ? { ...m, forwarded }
                  : m,
              ),
            })),

          addChatMessage: (input) => {
            const m: ChatMessage = { ...input, id: env.newId('chat'), at: env.now() };
            set((s) => ({ chatMessages: [...s.chatMessages, m] }));
            if (m.role === 'haushalt') {
              get().addEvent({
                caseId: m.caseId,
                type: 'assistent_gefragt',
                actor: householdActor(),
                payload: { messageId: m.id },
              });
            }
            return m;
          },

          addDiagnosis: (input) => {
            const c = get().cases[input.caseId];
            if (!c) return missingCase(input.caseId);
            const draft = draftDiagnosis(c, input);
            set((s) => ({
              diagnoses: [...s.diagnoses, draft.diagnosis],
              cases: { ...s.cases, [c.id]: draft.case },
              events: [...s.events, ...draft.events],
            }));
            return ok(draft.diagnosis);
          },

          addPhoto: (input) => {
            const photo: Photo = { ...input, id: env.newId('foto'), takenAt: env.now() };
            set((s) => {
              const c = photo.caseId ? s.cases[photo.caseId] : undefined;
              return {
                photos: [...s.photos, photo],
                cases: c
                  ? {
                      ...s.cases,
                      [c.id]: {
                        ...c,
                        photoIds: [...c.photoIds, photo.id],
                        updatedAt: photo.takenAt,
                      },
                    }
                  : s.cases,
                events: c
                  ? [
                      ...s.events,
                      {
                        id: env.newId('ev'),
                        caseId: c.id,
                        type: 'foto_aufgenommen',
                        at: photo.takenAt,
                        actor: householdActor(),
                        payload: {
                          photoId: photo.id,
                          purpose: photo.purpose,
                          source: photo.source,
                        },
                      },
                    ]
                  : s.events,
              };
            });
            return photo;
          },

          startGuide: (caseId, guideId) => {
            const before = get().cases[caseId];
            if (!before) return missingCase(caseId);
            // Auch Anleitungen, die der Katalog zur Laufzeit aufnimmt (Entscheidung 24)
            if (!getGuide(guideId))
              return refuse({ code: 'unbekannt', what: 'anleitung', id: guideId });
            // Eine offene Anleitung derselben Art geht weiter, wo du warst (B-05, R-06)
            const running = openRuns(caseId);
            const same = running.find((r) => r.guideId === guideId);
            if (same) return ok(same);
            if (!can(selectCaseFacts(get(), caseId), 'anleitung_starten')) {
              return refuse({ code: 'regel', action: 'anleitung_starten' });
            }
            // Eine andere offene Anleitung endet. Es gibt nie zwei offene Anleitungen.
            const ended = draftEndRuns(running);
            const now = env.now();
            const run: GuideRun = {
              id: env.newId('anleitung'),
              caseId,
              guideId,
              startedAt: now,
              currentStep: 0,
              completedSteps: [],
            };
            // Aus „offen“ wechselt der Fall in die Selbsthilfe, das Ereignis nennt die Anleitung
            const started = canTransition(before.status, 'anleitung_starten')
              ? draftCommand(before, 'anleitung_starten')
              : undefined;
            if (started && !started.ok) return started;
            const c = started?.value.case ?? before;
            const events: CaseEvent[] = started
              ? started.value.events.map((e) =>
                  e.type === 'anleitung_gestartet'
                    ? { ...e, payload: { ...e.payload, guideId, guideRunId: run.id } }
                    : e,
                )
              : [
                  {
                    id: env.newId('ev'),
                    caseId,
                    type: 'anleitung_gestartet',
                    at: now,
                    actor: householdActor(),
                    payload: { guideId, guideRunId: run.id },
                  },
                ];
            // Beendete Anleitung, neue Anleitung, Status und Ereignisse in einem Schritt
            set((s) => ({
              guideRuns: { ...s.guideRuns, ...ended.guideRuns, [run.id]: run },
              cases: { ...s.cases, [caseId]: { ...c, guideRunIds: [...c.guideRunIds, run.id] } },
              events: [...s.events, ...ended.events, ...events],
            }));
            return ok(run);
          },

          moveGuideStep: (runId, direction) => {
            const run = get().guideRuns[runId];
            if (!run || run.endedAt) return;
            const step = run.currentStep;
            const next: GuideRun =
              direction === 'next'
                ? {
                    ...run,
                    currentStep: step + 1,
                    completedSteps: [...new Set([...run.completedSteps, step])],
                  }
                : { ...run, currentStep: Math.max(0, step - 1) };
            const ev: CaseEvent = {
              id: env.newId('ev'),
              caseId: run.caseId,
              type: direction === 'next' ? 'schritt_erledigt' : 'schritt_zurueck',
              at: env.now(),
              actor: householdActor(),
              payload: { guideRunId: runId, guideId: run.guideId, step: step + 1 },
            };
            set((s) => ({
              guideRuns: { ...s.guideRuns, [runId]: next },
              events: [...s.events, ev],
            }));
          },

          confirmSafety: (runId, step) => {
            const run = get().guideRuns[runId];
            if (!run) return;
            get().addEvent({
              caseId: run.caseId,
              type: 'sicherheit_bestaetigt',
              actor: householdActor(),
              payload: { guideRunId: runId, guideId: run.guideId, step: step + 1 },
            });
          },

          finishGuide: (runId, outcome, note) => {
            const run = get().guideRuns[runId];
            if (!run) return refuse({ code: 'unbekannt', what: 'anleitung', id: runId });
            if (run.endedAt) return refuse({ code: 'regel', action: 'anleitung_fortsetzen' });
            const c = get().cases[run.caseId];
            if (!c) return missingCase(run.caseId);
            const now = env.now();
            const step = run.currentStep;
            const done =
              outcome === 'laeuft_wieder' || outcome === 'fertig' || outcome === 'laeuft_nicht';
            const ended: GuideRun = {
              ...run,
              outcome,
              endedAt: now,
              completedSteps: done
                ? [...new Set([...run.completedSteps, step])]
                : run.completedSteps,
              abortedAtStep: outcome === 'geht_nicht' ? step : undefined,
              abortNote: outcome === 'geht_nicht' && note?.trim() ? note.trim() : undefined,
            };
            const payload = { guideRunId: runId, guideId: run.guideId, step: step + 1 };
            const events: CaseEvent[] = [
              ...(outcome === 'geht_nicht'
                ? [
                    {
                      id: env.newId('ev'),
                      caseId: run.caseId,
                      type: 'schritt_geht_nicht' as const,
                      at: now,
                      actor: householdActor(),
                      payload: { ...payload, note: ended.abortNote },
                    },
                  ]
                : []),
              {
                id: env.newId('ev'),
                caseId: run.caseId,
                type: 'anleitung_beendet',
                at: now,
                actor: householdActor(),
                payload: { ...payload, outcome },
              },
            ];
            // Gelöst: erledigt. Sonst Hilfe holen. Beides nur, wo die Status-Maschine es erlaubt.
            const solved = outcome === 'laeuft_wieder' || outcome === 'fertig';
            const command: CaseCommand = solved ? 'selbst_geloest' : 'hilfe_holen';
            const next = canTransition(c.status, command)
              ? draftCommand(c, command, {
                  resolution: solved && c.entry === 'pflege' ? 'pflege_erledigt' : undefined,
                })
              : undefined;
            if (next && !next.ok) return next;
            // Anleitung, Ereignisse und Status in einem Schritt
            set((s) => ({
              guideRuns: { ...s.guideRuns, [runId]: ended },
              cases: next ? { ...s.cases, [c.id]: next.value.case } : s.cases,
              events: [...s.events, ...events, ...(next?.value.events ?? [])],
            }));
            return ok(ended);
          },

          requestVideoCall: (caseId, confirm = {}) => {
            const c = get().cases[caseId];
            if (!c) return missingCase(caseId);
            if (!can(selectCaseFacts(get(), caseId), 'videocall_anfragen')) {
              return refuse({ code: 'regel', action: 'videocall_anfragen' });
            }
            // Wer einen Call startet, holt Hilfe. Das geht auch aus der Selbsthilfe.
            const escalated = canTransition(c.status, 'hilfe_holen')
              ? draftCommand(c, 'hilfe_holen')
              : undefined;
            if (escalated && !escalated.ok) return escalated;
            if (!namesExpert(caseId, confirm.share, confirm.screenshots)) {
              return refuse({ code: 'bestaetigung', purpose: 'weitergabe_fachkraft' });
            }
            const share = confirm.share ? draftConsent(confirm.share) : undefined;
            const shots = confirm.screenshots ? draftConsent(confirm.screenshots) : undefined;
            const consents = [
              ...get().consents,
              ...(share ? [share.consent] : []),
              ...(shots ? [shots.consent] : []),
            ];
            // Erst die Bestätigung an die Fachkraft, dann der Call (B-19)
            if (!canStartVideoCall(consents, c.reportedBy, caseId)) {
              return refuse({ code: 'bestaetigung', purpose: 'weitergabe_fachkraft' });
            }
            const { expert } = caseService(get(), caseId);
            const partner = expert.partner;
            const now = env.now();
            const session: VideoSession = {
              id: env.newId('video'),
              caseId,
              expert: {
                name: expert.name,
                provider: { id: partner.id, kind: 'betrieb', name: partner.name },
              },
              requestedAt: now,
              recording: false,
              screenshotsConsentId: shots?.consent.id,
            };
            const requested: CaseEvent = {
              id: env.newId('ev'),
              caseId,
              type: 'videocall_angefragt',
              at: env.now(),
              actor: householdActor(),
              payload: { sessionId: session.id, expert: session.expert.name },
            };
            // Hilfe holen, Bestätigungen, Call und Ereignisse in einem Schritt
            set((s) => ({
              cases: escalated ? { ...s.cases, [caseId]: escalated.value.case } : s.cases,
              consents,
              videoSessions: [...s.videoSessions, session],
              events: [
                ...s.events,
                ...(escalated?.value.events ?? []),
                ...(share?.events ?? []),
                ...(shots?.events ?? []),
                requested,
              ],
            }));
            return ok(session);
          },

          updateVideoCall: (sessionId, change) => {
            const session = get().videoSessions.find((v) => v.id === sessionId);
            if (!session) return refuse({ code: 'unbekannt', what: 'videocall', id: sessionId });
            const c = get().cases[session.caseId];
            if (!c) return missingCase(session.caseId);
            // Auch beim Verbinden gilt: nur mit gültiger Bestätigung
            if (change === 'verbunden' && !canStartVideoCall(get().consents, c.reportedBy, c.id)) {
              return refuse({ code: 'bestaetigung', purpose: 'weitergabe_fachkraft' });
            }
            const now = env.now();
            const next: VideoSession =
              change === 'verbunden'
                ? { ...session, startedAt: now, outcome: 'verbunden' }
                : change === 'beendet'
                  ? { ...session, endedAt: now }
                  : { ...session, endedAt: now, outcome: change };
            const ev: CaseEvent = {
              id: env.newId('ev'),
              caseId: session.caseId,
              type: change === 'verbunden' ? 'videocall_gestartet' : 'videocall_beendet',
              at: env.now(),
              actor:
                change === 'verbunden'
                  ? { kind: 'fachkraft', name: session.expert.name }
                  : householdActor(),
              payload: { sessionId, outcome: next.outcome, change },
            };
            set((s) => ({
              videoSessions: s.videoSessions.map((v) => (v.id === sessionId ? next : v)),
              events: [...s.events, ev],
            }));
            return ok(next);
          },

          requestCallback: (caseId, slot, confirm) => {
            const c = get().cases[caseId];
            if (!c) return missingCase(caseId);
            if (!namesExpert(caseId, confirm)) {
              return refuse({ code: 'bestaetigung', purpose: 'weitergabe_fachkraft' });
            }
            const share = confirm ? draftConsent(confirm) : undefined;
            const consents = share ? [...get().consents, share.consent] : get().consents;
            // Wie beim Videocall: ohne gültige Bestätigung geht nichts an die Fachkraft (R-16)
            if (!canStartVideoCall(consents, c.reportedBy, caseId)) {
              return refuse({ code: 'bestaetigung', purpose: 'weitergabe_fachkraft' });
            }
            if (!can(selectCaseFacts({ ...get(), consents }, caseId), 'rueckruf_anfragen')) {
              return refuse({ code: 'regel', action: 'rueckruf_anfragen' });
            }
            const requested: CaseEvent = {
              id: env.newId('ev'),
              caseId,
              type: 'videocall_angefragt',
              at: env.now(),
              actor: householdActor(),
              payload: { art: 'rueckruf', slot },
            };
            // Bestätigung und Rückruf in einem Schritt
            set((s) => ({
              consents,
              events: [...s.events, ...(share?.events ?? []), requested],
            }));
            return ok();
          },

          setFinding: (caseId, option, by) => {
            const cfg = demoConfig;
            const c = get().cases[caseId];
            if (!c) return missingCase(caseId);
            // Vor Ort schreibt der gebuchte Betrieb den Befund, nicht der erste aus der
            // Konfiguration (R-10). Ohne Termin zur Vor-Ort-Diagnose gibt es keinen Befund vor Ort.
            const visit =
              by === 'betrieb'
                ? selectCaseFacts(get(), caseId)?.bookings.vor_ort_diagnose
                : undefined;
            if (by === 'betrieb' && !visit) {
              return refuse({ code: 'unbekannt', what: 'termin', id: caseId });
            }
            const actorName = visit ? visit.provider.name : caseService(get(), caseId).expert.name;
            const actor: CaseEvent['actor'] = visit
              ? { kind: 'betrieb', id: visit.provider.id, name: actorName }
              : { kind: 'fachkraft', name: actorName };
            const appliance = caseAppliance(get(), caseId);
            const finding = draftDiagnosis(c, {
              caseId,
              photoIds: [],
              mode: 'bauteil',
              errorPattern:
                option === 'geloest'
                  ? 'im_call_geloest'
                  : option === 'ersatzgeraet'
                    ? 'ersatzgeraet_noetig'
                    : findingPattern(caseCategory(get(), caseId)),
              component: option === 'geloest' ? undefined : appliance.finding.component,
              confidence: 'hoch',
              confidenceScore: 1,
              source: by,
            });
            const found = draftEvent({
              caseId,
              type: 'befund_erstellt',
              actor,
              payload: { diagnosisId: finding.diagnosis.id, option },
            });
            if (option === 'geloest') {
              // Im Call gelöst: erledigt, wo die Status-Maschine es erlaubt
              const solved = canTransition(c.status, 'im_call_geloest')
                ? draftCommand(finding.case, 'im_call_geloest')
                : undefined;
              if (solved && !solved.ok) return solved;
              const after = solved?.value.case ?? finding.case;
              set((s) => ({
                diagnoses: [...s.diagnoses, finding.diagnosis],
                cases: { ...s.cases, [caseId]: after },
                events: [...s.events, ...finding.events, found, ...(solved?.value.events ?? [])],
              }));
              return ok(after);
            }
            const device = get().devices.find((x) => x.id === c.deviceId);
            const contract = get().contracts.find((k) => k.id === device?.contractId);
            const quote = createQuote({
              id: env.newId('angebot'),
              caseId,
              createdBy: { kind: by, name: actorName },
              repair: {
                partName: appliance.finding.component,
                originalPart: true,
                parts: cfg.prices.repair.parts,
                labor: cfg.prices.repair.labor,
              },
              replacement: { total: cfg.prices.replacement, note: de.finding.replacementNote },
              payer: contract
                ? { kind: 'versicherer', name: contract.provider.name }
                : { kind: 'haushalt', name: get().persons[0]?.displayName ?? '' },
              deductible: contract ? get().demo.deductible : 0,
              isExample: cfg.isExample,
              createdAt: env.now(),
            });
            const offered = draftEvent({
              caseId,
              type: 'angebot_erstellt',
              actor,
              payload: {
                quoteId: quote.id,
                repair: quote.repair.total,
                replacement: quote.replacement.total,
                saving: quote.saving,
              },
            });
            const after: Case = { ...finding.case, quoteId: quote.id };
            // Befund, Kostenvoranschlag und Ereignisse in einem Schritt
            set((s) => ({
              diagnoses: [...s.diagnoses, finding.diagnosis],
              quotes: [...s.quotes, quote],
              cases: { ...s.cases, [caseId]: after },
              events: [...s.events, ...finding.events, found, offered],
            }));
            return ok(after);
          },

          reportClaim: (caseId) => {
            const c = get().cases[caseId];
            if (!c) return missingCase(caseId);
            const device = get().devices.find((d) => d.id === c.deviceId);
            const contract = get().contracts.find((k) => k.id === device?.contractId);
            if (!contract) return refuse({ code: 'vertrag' });
            // Erst die Regel, dann die Bestätigung: Nach der Meldung entsteht keine zweite (R-02)
            if (!can(selectCaseFacts(get(), caseId), 'schaden_melden')) {
              return refuse({ code: 'regel', action: 'schaden_melden' });
            }
            // Umfang aus CONSENT_SCOPES, wie in der Vorschau „Das geht an …“ (R-14)
            const confirmed = draftConsent(
              scopedConsent('weitergabe_versicherer', {
                caseId,
                recipient: contract.provider,
                text: textStamp(TRANSFER_TEXT.weitergabe_versicherer, caseNames(get(), caseId)),
              }),
            );
            const reported = draftCommand(c, 'schaden_melden', { contractId: contract.id }, [
              ...get().consents,
              confirmed.consent,
            ]);
            if (!reported.ok) return reported;
            // Bestätigung, Meldung und Status in einem Schritt
            set((s) => ({
              consents: [...s.consents, confirmed.consent],
              cases: { ...s.cases, [caseId]: reported.value.case },
              events: [...s.events, ...confirmed.events, ...reported.value.events],
            }));
            return ok(reported.value.case);
          },

          requestBooking: ({ caseId, kind, partnerId, slotLabel, selfPay, partName }) => {
            const before = get().cases[caseId];
            if (!before) return missingCase(caseId);
            // Ökodesign: Pumpen sind Teile für fachlich kompetente Reparateure, nicht für Endnutzer
            const pumpOrSensor = Object.values(de.appliance).some(
              (a) => a.finding.component === partName,
            );
            if (kind === 'ersatzteil_versand' && pumpOrSensor && partName) {
              return refuse({ code: 'nur_betrieb', part: partName });
            }
            const partner = caseService(get(), caseId).partners.find((p) => p.id === partnerId);
            if (!partner) return refuse({ code: 'unbekannt', what: 'betrieb', id: partnerId });
            // Dieselben Regeln wie in den Screens: höchstens ein Termin je Art (R-08), nach der
            // Ablehnung keiner auf Kosten des Versicherers (R-09). Erst prüfen, dann schreiben.
            const facts = selectCaseFacts(get(), caseId)!;
            const planned = planBooking(facts, get().bookings, kind, selfPay);
            if (!planned.ok) return planned;
            const plan = planned.value;
            if (plan.action && !can(facts, plan.action)) {
              return refuse({ code: 'regel', action: plan.action });
            }
            // Selbst zahlen wechselt in die Reparatur. Die Regel termin_selbst erlaubt es nur dort,
            // wo die Status-Maschine es zulässt.
            const paid =
              plan.action === 'termin_selbst' ? draftCommand(before, 'selbst_zahlen') : undefined;
            if (paid && !paid.ok) return paid;
            const c = paid?.value.case ?? before;
            const provider = { id: partner.id, kind: 'betrieb' as const, name: partner.name };
            const confirmed = draftConsent(
              scopedConsent('weitergabe_betrieb', {
                caseId,
                recipient: provider,
                text: textStamp(TRANSFER_TEXT.weitergabe_betrieb, caseNames(get(), caseId)),
              }),
            );
            const requestedBooking: Booking = {
              id: env.newId('termin'),
              caseId,
              kind,
              provider: { ...provider, authorized: partner.authorized },
              slotLabel,
              status: 'angefragt',
              subjectToApproval: plan.subjectToApproval,
              address: get().household?.address,
              createdAt: env.now(),
            };
            // Steht fest, was du zahlst (Selbstzahler, oder nach der Freigabe die Selbstbeteiligung
            // über 0 €), heißt der Button „Zahlungspflichtig buchen“, und die Buchung ist mit diesem
            // Tap verbindlich. Während der Prüfung und ohne Preis bleibt sie eine Anfrage (Nr. 31).
            const costs = bookingCosts(facts, kind, selfPay, facts.deductible);
            const amount = amountDue(costs);
            const bound =
              amount > 0
                ? draftBinding(
                    requestedBooking,
                    amount,
                    costs?.payer === 'versicherer' ? 'selbstbeteiligung' : 'preis',
                    false,
                  )
                : undefined;
            const booking = bound?.booking ?? requestedBooking;
            const requested: CaseEvent = {
              id: env.newId('ev'),
              caseId,
              type: 'termin_angefragt',
              at: env.now(),
              actor: householdActor(),
              payload: {
                bookingId: booking.id,
                kind,
                partner: partner.name,
                slot: slotLabel,
                subjectToApproval: booking.subjectToApproval,
              },
            };
            // Status, Bestätigung, Termin und Ereignisse in einem Schritt. Umbuchen storniert den
            // alten Termin und legt den neuen an.
            set((s) => ({
              consents: [...s.consents, confirmed.consent],
              bookings: [
                ...s.bookings.map((b) =>
                  plan.replaces.includes(b.id) ? { ...b, status: 'storniert' as const } : b,
                ),
                booking,
              ],
              cases: { ...s.cases, [caseId]: { ...c, bookingId: booking.id } },
              events: [
                ...s.events,
                ...(paid?.value.events ?? []),
                ...confirmed.events,
                requested,
                ...(bound ? [bound.event] : []),
              ],
            }));
            return ok(booking);
          },

          bookBinding: (caseId, shown) => {
            const c = get().cases[caseId];
            if (!c) return missingCase(caseId);
            const facts = selectCaseFacts(get(), caseId)!;
            const due = facts.bindingDue;
            if (!due) return refuse({ code: 'regel', action: 'zahlungspflichtig_buchen' });
            // Der Betrieb bekommt den Auftrag nur mit gültiger Weitergabe an genau ihn (lit. b)
            const provider = due.booking.provider;
            if (
              !findActiveConsent(
                get().consents,
                c.reportedBy,
                'weitergabe_betrieb',
                caseId,
                provider.id,
              )
            ) {
              return refuse({ code: 'bestaetigung', purpose: 'weitergabe_betrieb' });
            }
            if (!can(facts, 'zahlungspflichtig_buchen')) {
              return refuse({ code: 'regel', action: 'zahlungspflichtig_buchen' });
            }
            // Gebucht wird nur der Betrag, den du gesehen hast
            if (shown !== due.amount) return refuse({ code: 'betrag', shown, due: due.amount });
            const bound = draftBinding(due.booking, due.amount, due.reason, true);
            set((s) => ({
              bookings: s.bookings.map((b) => (b.id === bound.booking.id ? bound.booking : b)),
              events: [...s.events, bound.event],
            }));
            return ok(bound.booking);
          },

          declineBinding: (caseId) => {
            const c = get().cases[caseId];
            if (!c) return missingCase(caseId);
            const facts = selectCaseFacts(get(), caseId)!;
            const due = facts.bindingDue;
            if (!due || !can(facts, 'nicht_buchen')) {
              return refuse({ code: 'regel', action: 'nicht_buchen' });
            }
            const declined: Booking = { ...due.booking, status: 'storniert' };
            const ev = draftEvent({
              caseId,
              type: 'nicht_gebucht',
              actor: householdActor(),
              payload: {
                bookingId: declined.id,
                kind: declined.kind,
                partner: declined.provider.name,
                slot: declined.slotLabel,
                amount: due.amount,
                reason: due.reason,
              },
            });
            set((s) => ({
              bookings: s.bookings.map((b) => (b.id === declined.id ? declined : b)),
              events: [...s.events, ev],
            }));
            return ok(declined);
          },

          setNotifications: (value, shown = 'mitteilungen') => {
            set({ notifications: value });
            if (value === 'erlaubt') {
              if (notificationsOn(get())) return;
              get().grantConsent(
                scopedConsent('mitteilungen', {
                  recipient: { ...NOTIFICATIONS_RECIPIENT },
                  text: textStamp(shown),
                }),
              );
              return;
            }
            for (const c of get().consents) {
              if (c.purpose === 'mitteilungen' && !c.revokedAt) get().revokeConsent(c.id);
            }
          },

          simulateNext: (caseId) => {
            const cfg = demoConfig;
            const c = get().cases[caseId];
            if (!c) return false;
            // Ein geschlossener Fall hat keinen nächsten Schritt, auch nicht nach dem Abbruch (Nr. 34)
            if (isClosed(c.status)) return false;
            // Widerrufene Weitergabe: Versicherer und Betrieb machen nicht weiter (R-12)
            if (simulationHold(get(), caseId)) return false;
            const booking = activeBooking(get(), caseId);
            const partner = booking?.provider.name ?? '';
            // Nur mit erteilter Einwilligung in Mitteilungen (R-13). Der Text ist neutral, denn
            // er steht auf dem Sperrbildschirm (R-17).
            const notify = () => {
              const msg = de.notify.update;
              if (notificationsOn(get()))
                notifications.notify(msg.title, msg.body).catch(() => undefined);
            };
            const setBooking = (patch: Partial<Booking>) =>
              set((s) => ({
                bookings: s.bookings.map((b) => (b.id === booking!.id ? { ...b, ...patch } : b)),
              }));
            const betrieb: CaseEvent['actor'] = { kind: 'betrieb', name: partner };

            if (c.status === 'freigabe_noetig') {
              const approve = get().demo.claimScenario === 'freigeben';
              const quote = get().quotes.find((q) => q.id === c.quoteId);
              const decided = get().runCommand(
                caseId,
                approve ? 'freigabe_erteilt' : 'freigabe_abgelehnt',
                {
                  actor: { kind: 'versicherer', name: insurerName(get(), caseId) },
                  decisionActor: 'mensch',
                  approvedAmount: approve ? quote?.repair.total : undefined,
                },
              );
              if (!decided.ok) return false;
              notify();
              return true;
            }
            if (!booking) return false;
            // Ein Termin, für den du zahlst, gilt erst mit „Zahlungspflichtig buchen“ (Nr. 31).
            // Bis dahin bestätigt der Betrieb nicht, weder per Timer noch per „Nächster Schritt“.
            if (selectCaseFacts(get(), caseId)?.bindingDue) return false;
            // Nr. 33: Zur Vor-Ort-Diagnose nennt der Betrieb vor dem Termin den Preis. Dann wartet der
            // Termin auf „Zahlungspflichtig buchen“ oder „Nicht buchen“.
            if (
              booking.kind === 'vor_ort_diagnose' &&
              booking.status === 'angefragt' &&
              booking.price === undefined &&
              c.status === 'eskaliert'
            ) {
              const price = cfg.prices.diagnosis;
              const named = draftEvent({
                caseId,
                type: 'preis_genannt',
                actor: { ...betrieb, id: booking.provider.id },
                payload: { bookingId: booking.id, partner, price },
              });
              set((s) => ({
                bookings: s.bookings.map((b) => (b.id === booking.id ? { ...b, price } : b)),
                events: [...s.events, named],
              }));
              notify();
              return true;
            }
            const confirmable =
              c.status === 'freigegeben' ||
              c.status === 'in_reparatur' ||
              c.status === 'nachbesserung' ||
              (c.status === 'eskaliert' && booking.kind === 'vor_ort_diagnose');
            if (booking.status === 'angefragt' && confirmable) {
              if (c.status === 'freigegeben') {
                // Erst der Status, dann die Buchung: Ohne Übergang bleibt alles, wie es ist
                if (!get().runCommand(caseId, 'termin_bestaetigt', { actor: betrieb }).ok) {
                  return false;
                }
                setBooking({ status: 'bestaetigt' });
              } else {
                setBooking({ status: 'bestaetigt' });
                get().addEvent({
                  caseId,
                  type: 'termin_bestaetigt',
                  actor: betrieb,
                  payload: { bookingId: booking.id },
                });
              }
              notify();
              return true;
            }
            if (booking.status === 'bestaetigt') {
              setBooking({ status: 'unterwegs' });
              get().addEvent({
                caseId,
                type: 'betrieb_unterwegs',
                actor: betrieb,
                payload: { bookingId: booking.id },
              });
              notify();
              return true;
            }
            if (booking.status === 'unterwegs') {
              if (booking.kind === 'vor_ort_diagnose') {
                setBooking({ status: 'erledigt', completedAt: env.now() });
                get().setFinding(caseId, 'reparatur', 'betrieb');
                notify();
                return true;
              }
              const photo = get().addPhoto({
                caseId,
                deviceId: c.deviceId,
                purpose: 'abschluss',
                source: 'betrieb',
                uri: '',
              });
              // Der Abschluss ist der Beginn der Gewährleistung (Nr. 32)
              setBooking({
                status: 'erledigt',
                completionPhotoId: photo.id,
                completedAt: env.now(),
              });
              get().addEvent({
                caseId,
                type: 'reparatur_abgeschlossen',
                actor: betrieb,
                payload: {
                  bookingId: booking.id,
                  photoId: photo.id,
                  ...(booking.reworkOf ? { rework: true } : {}),
                },
              });
              notify();
              return true;
            }
            return false;
          },

          confirmRepair: (caseId, works) => {
            const c = get().cases[caseId];
            if (!c) return missingCase(caseId);
            const action = works ? 'reparatur_bestaetigen' : 'problem_besteht_weiter';
            const facts = selectCaseFacts(get(), caseId);
            if (!facts || !can(facts, action)) return refuse({ code: 'regel', action });
            // Hat die Reparatur nicht geholfen: Läuft die Gewährleistung noch (Nr. 32)? Die Demo
            // kann so tun, als wäre sie vorbei. Dann prüft sie einen Tag nach dem Ende der Frist.
            const now = env.now();
            const months = demoConfig.warranty.months;
            const asOf = get().demo.repairLongAgo ? addMonths(now, months + 1) : now;
            const warranty = works ? undefined : checkWarranty(facts, asOf, months);
            const command: CaseCommand = works
              ? 'repariert'
              : warranty?.within
                ? 'nachbesserung_verlangen'
                : 'problem_besteht_weiter';
            const result = draftCommand(c, command);
            if (!result.ok) return result;
            // Die Fallakte sagt, warum: Nachbesserung mit Betrieb und Frist, oder warum nicht
            const events = result.value.events.map((e) => {
              if (e.type === 'nachbesserung_verlangt' && warranty?.within) {
                const r = warranty.rework;
                return {
                  ...e,
                  payload: {
                    bookingId: r.repairBookingId,
                    partner: r.provider.name,
                    completedAt: r.completedAt,
                    until: r.until,
                  },
                };
              }
              if (e.type === 'problem_besteht_weiter' && warranty && !warranty.within) {
                return {
                  ...e,
                  payload: {
                    warranty: warranty.reason,
                    ...(get().demo.repairLongAgo ? { demoLongAgo: true } : {}),
                  },
                };
              }
              return e;
            });
            // Die Runde endet (model/policies/rounds.ts). In der Gewährleistung ist die neue Runde
            // eine Nachbesserung beim selben Betrieb, ohne Schadenfall und ohne Kosten.
            const closed = works ? result.value.case : closeRound(result.value.case, get(), now);
            const next: Case = warranty?.within
              ? { ...closed, rework: { ...warranty.rework, claimedAt: now } }
              : closed;
            const confirmed = works
              ? [
                  draftEvent({
                    caseId,
                    type: 'abschluss_bestaetigt',
                    actor: householdActor(),
                    payload: {},
                  }),
                ]
              : [];
            set((s) => ({
              cases: { ...s.cases, [caseId]: next },
              events: [...s.events, ...events, ...confirmed],
            }));
            return ok(next);
          },

          requestRework: (caseId, slotLabel) => {
            const c = get().cases[caseId];
            if (!c) return missingCase(caseId);
            const facts = selectCaseFacts(get(), caseId)!;
            const rework = facts.rework;
            if (!rework || facts.closed) {
              return refuse({ code: 'regel', action: 'nachbesserung_anfragen' });
            }
            if (booked(facts, 'reparatur'))
              return refuse({ code: 'termin_laeuft', kind: 'reparatur' });
            // Derselbe Betrieb mit der Weitergabe, die er für die Reparatur bekam (lit. b). Nach
            // einem Widerruf bestätigst du sie erst erneut (renewTransfer).
            const shared = findActiveConsent(
              get().consents,
              c.reportedBy,
              'weitergabe_betrieb',
              caseId,
              rework.provider.id,
            );
            if (!shared) return refuse({ code: 'bestaetigung', purpose: 'weitergabe_betrieb' });
            if (!can(facts, 'nachbesserung_anfragen')) {
              return refuse({ code: 'regel', action: 'nachbesserung_anfragen' });
            }
            const booking: Booking = {
              id: env.newId('termin'),
              caseId,
              kind: 'reparatur',
              provider: { ...rework.provider },
              slotLabel,
              status: 'angefragt',
              subjectToApproval: false,
              reworkOf: rework.repairBookingId,
              address: get().household?.address,
              createdAt: env.now(),
            };
            const requested = draftEvent({
              caseId,
              type: 'termin_angefragt',
              actor: householdActor(),
              payload: {
                bookingId: booking.id,
                kind: booking.kind,
                partner: booking.provider.name,
                slot: slotLabel,
                subjectToApproval: false,
                rework: true,
              },
            });
            set((s) => ({
              bookings: [...s.bookings, booking],
              cases: {
                ...s.cases,
                [caseId]: { ...c, bookingId: booking.id, updatedAt: env.now() },
              },
              events: [...s.events, requested],
            }));
            return ok(booking);
          },

          rateBooking: (bookingId, stars) => {
            const booking = get().bookings.find((b) => b.id === bookingId);
            if (!booking) return;
            const at = env.now();
            set((s) => ({
              bookings: s.bookings.map((b) =>
                b.id === bookingId ? { ...b, rating: { stars, at } } : b,
              ),
            }));
            get().addEvent({
              caseId: booking.caseId,
              type: 'bewertet',
              actor: householdActor(),
              payload: { bookingId, stars },
            });
          },

          escalate: (caseId) => get().runCommand(caseId, 'hilfe_holen'),

          pauseCase: (caseId) => {
            const c = get().cases[caseId];
            if (!c) return missingCase(caseId);
            if (!can(selectCaseFacts(get(), caseId), 'pausieren')) {
              return refuse({ code: 'regel', action: 'pausieren' });
            }
            const result = pause(c, { actor: householdActor(), now: env.now(), newId: env.newId });
            commit(result);
            return ok(result.case);
          },

          resumeCase: (caseId) => {
            const c = get().cases[caseId];
            if (!c) return missingCase(caseId);
            const result = resume(c, { actor: householdActor(), now: env.now(), newId: env.newId });
            commit(result);
            return ok(result.case);
          },

          grantConsent: (input) => {
            const { consent, events } = draftConsent(input);
            set((s) => ({ consents: [...s.consents, consent], events: [...s.events, ...events] }));
            return consent;
          },

          revokeConsent: (consentId) => {
            const now = env.now();
            const target = get().consents.find((c) => c.id === consentId);
            if (!target || target.revokedAt) return;
            set((s) => ({
              consents: s.consents.map((c) => (c.id === consentId ? { ...c, revokedAt: now } : c)),
            }));
            // Ohne Einwilligung in den Assistenten braucht es auch die Installations-ID nicht mehr
            const chatLeft = get().consents.some(
              (c) => c.purpose === 'chat_assistent' && !c.revokedAt,
            );
            if (target.purpose === 'chat_assistent' && !chatLeft) void deleteInstallationId();
            // In die Fallakte, wenn die Einwilligung zu einem Fall gehört. Sonst steht der Widerruf an der Einwilligung.
            if (target.caseId) {
              get().addEvent({
                caseId: target.caseId,
                type: 'einwilligung_widerrufen',
                actor: householdActor(),
                payload: { consentId, purpose: target.purpose, recipient: target.recipient.name },
              });
            }
          },

          renewTransfer: (caseId) => {
            const c = get().cases[caseId];
            if (!c) return missingCase(caseId);
            const facts = selectCaseFacts(get(), caseId)!;
            const purpose = facts.hold;
            if (!purpose || !can(facts, 'weitergabe_erneuern')) {
              return refuse({ code: 'regel', action: 'weitergabe_erneuern' });
            }
            // Derselbe Empfänger wie beim ersten Mal: der Versicherer des Vertrags oder genau der
            // gebuchte Betrieb (siehe holdOf in model/policies/caseFacts.ts)
            let recipient: Consent['recipient'];
            if (purpose === 'weitergabe_versicherer') {
              const device = get().devices.find((d) => d.id === c.deviceId);
              const contract = get().contracts.find((k) => k.id === device?.contractId);
              if (!contract) return refuse({ code: 'vertrag' });
              recipient = contract.provider;
            } else {
              // Der gebuchte Betrieb, oder vor dem Termin zur Nachbesserung der Betrieb der Reparatur
              const provider = facts.booking?.provider ?? facts.rework?.provider;
              if (!provider) return refuse({ code: 'regel', action: 'weitergabe_erneuern' });
              recipient = { id: provider.id, kind: provider.kind, name: provider.name };
            }
            const { consent, events } = draftConsent(
              scopedConsent(purpose, {
                caseId,
                recipient,
                text: textStamp(TRANSFER_TEXT[purpose], caseNames(get(), caseId)),
              }),
            );
            set((s) => ({ consents: [...s.consents, consent], events: [...s.events, ...events] }));
            return ok(consent);
          },

          addEvent: (input) => {
            const ev: CaseEvent = { ...input, id: env.newId('ev'), at: env.now() };
            set((s) => ({ events: [...s.events, ev] }));
            return ev;
          },

          // Die Darstellung ist eine Einstellung des Telefons, kein Demo-Stand. Die Installations-ID
          // für das Rate-Limit geht mit, sie entstand mit der Einwilligung in den Assistenten.
          reset: () => {
            set({ ...initialData, appearance: get().appearance });
            void deleteInstallationId();
          },

          // Der Startstand hat keine Einwilligung in den Assistenten, also auch keine Installations-ID
          loadDemoStart: (kind) => {
            set({ ...demoStartData(initialData, kind), appearance: get().appearance });
            void deleteInstallationId();
          },
        };
      },
      {
        name: STORE_KEY,
        version: STORE_VERSION,
        storage: safeStorage,
        // Wirft bei unbekannter Version. Die Form prüft merge gleich danach.
        migrate: (persisted, version) => migrateStoredState(persisted, version) as AppData,
        // Prüft die Form, bevor die App etwas davon zeigt. Neue Einstellungen ergänzen
        // gespeicherte Stände, statt sie zu verlieren. Leerer Speicher: der Anfangsstand.
        merge: (persisted, current) => {
          if (persisted === undefined) return current;
          const p = parseStoredState(persisted);
          // Gespeicherte Katalog-Einträge stehen sofort wieder zur Verfügung
          p.guideCatalog?.forEach(registerCatalogEntry);
          return { ...current, ...p, demo: { ...current.demo, ...p.demo } };
        },
        // Meldet jeden Ausgang. Nach einem Fehler sichert es den Rohwert, falls getItem das
        // nicht schon getan hat. Das Schreiben beginnt, bevor der Fehler sichtbar wird.
        // Bis zur Entscheidung im Hinweis schreibt die App nichts in den Speicher.
        onRehydrateStorage: () => {
          loading.setState({ status: 'laedt' }, true);
          return (state, error) => {
            if (state !== undefined && error === undefined) {
              loading.setState({ status: 'ok' }, true);
              return;
            }
            safeStorage.backupLastRead().catch(() => {});
            loading.setState({ status: 'fehler', error }, true);
          };
        },
        partialize: (s): AppData => ({
          onboardingDone: s.onboardingDone,
          appearance: s.appearance,
          demo: s.demo,
          notifications: s.notifications,
          household: s.household,
          persons: s.persons,
          contracts: s.contracts,
          devices: s.devices,
          cases: s.cases,
          events: s.events,
          photos: s.photos,
          diagnoses: s.diagnoses,
          guideRuns: s.guideRuns,
          consents: s.consents,
          quotes: s.quotes,
          bookings: s.bookings,
          videoSessions: s.videoSessions,
          chatMessages: s.chatMessages,
          guideCatalog: s.guideCatalog,
          shares: s.shares,
          nextCaseNumber: s.nextCaseNumber,
        }),
      },
    ),
  );

  /**
   * „Zurücksetzen“ im Hinweis zum Wiederherstellen: sichert den gespeicherten Rohwert, löscht
   * ihn, setzt den Stand zurück und lädt neu. Lässt sich der Rohwert nicht sichern, wirft es,
   * bevor etwas gelöscht ist. Die Sicherungen bleiben. Die Installations-ID ist gelöscht, bevor
   * die App wieder aufgeht, denn ob es noch eine Einwilligung in den Assistenten gab, lässt sich
   * aus dem kaputten Stand nicht lesen.
   */
  const resetStoredState = async () => {
    await safeStorage.backupStored(STORE_KEY);
    await safeStorage.removeItem(STORE_KEY);
    store.getState().reset();
    await deleteInstallationId();
    await store.persist.rehydrate();
  };

  /** loading: Ladezustand des gespeicherten Stands, siehe useHydrated */
  return Object.assign(store, { loading, resetStoredState });
}

export type AppStore = ReturnType<typeof createAppStore>;

export const useAppStore: AppStore = createAppStore();

/** Offene Fälle, neueste zuerst */
export function selectOpenCases(s: AppData): Case[] {
  return Object.values(s.cases)
    .filter((c) => !isClosed(c.status))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Laufender Termin eines Falls (nicht storniert) */
/** Neuester Termin der laufenden Runde, der nicht storniert ist */
export function activeBooking(s: AppData, caseId: Id): Booking | undefined {
  const c = s.cases[caseId];
  if (!c) return undefined;
  return currentBookings(c, s.bookings)
    .reverse()
    .find((b) => b.status !== 'storniert');
}

const bookingEvents: CaseEvent['type'][] = [
  'termin_angefragt',
  'preis_genannt',
  'zahlungspflichtig_gebucht',
  'termin_bestaetigt',
  'betrieb_unterwegs',
  'freigabe_entschieden',
];

/**
 * Übergangsregel für den Widerruf bei lit. b, bis Entscheidung Nr. 16 steht: Die Simulation hält
 * an, solange die Weitergabe für ihren nächsten Schritt widerrufen ist. Gibt den Zweck zurück,
 * dessen Bestätigung fehlt. Die Regel steht in model/policies/caseFacts.ts.
 */
export function simulationHold(s: AppData, caseId: Id): ConsentPurpose | undefined {
  return selectCaseFacts(s, caseId)?.hold;
}

/** Wann der nächste simulierte Schritt fällig ist (ms seit 1970). Ohne nächsten Schritt: undefined. */
export function nextSimulationDue(s: AppData, caseId: Id): number | undefined {
  const c = s.cases[caseId];
  if (!c || isClosed(c.status)) return undefined;
  if (simulationHold(s, caseId)) return undefined;
  // Wartet auf „Zahlungspflichtig buchen“: Hier passiert nichts ohne deinen Tap (Nr. 31)
  if (selectCaseFacts(s, caseId)?.bindingDue) return undefined;
  const { claimMs, bookingStepMs } = demoConfig.timers;
  if (c.status === 'freigabe_noetig' && c.claim) return Date.parse(c.claim.reportedAt) + claimMs;
  const booking = activeBooking(s, caseId);
  if (!booking || booking.status === 'erledigt') return undefined;
  if (
    booking.status === 'angefragt' &&
    (c.status === 'freigabe_noetig' || c.status === 'abgelehnt')
  )
    return undefined;
  const last = s.events
    .filter((e) => e.caseId === caseId && bookingEvents.includes(e.type))
    .map((e) => Date.parse(e.at))
    .sort((a, b) => b - a)[0];
  return (last ?? Date.parse(booking.createdAt)) + bookingStepMs;
}

/** Mitteilungen sind an: Das System erlaubt sie, und die Einwilligung gilt (R-13) */
export function notificationsOn(s: AppData): boolean {
  const person = s.persons[0];
  return (
    s.notifications === 'erlaubt' &&
    !!person &&
    !!findActiveConsent(s.consents, person.id, 'mitteilungen')
  );
}

export function selectContract(s: AppData): Contract | undefined {
  return s.contracts[0];
}

export function selectDevice(s: AppData, id: Id | undefined): Device | undefined {
  return s.devices.find((d) => d.id === id);
}

export function selectCaseEvents(s: AppData, caseId: Id): CaseEvent[] {
  return s.events.filter((e) => e.caseId === caseId);
}
