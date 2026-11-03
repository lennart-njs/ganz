// Zustand der App, mit persist auf AsyncStorage. Ein offener Fall übersteht den Neustart (B-03).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, type StateStorage } from 'zustand/middleware';

import { demoConfig } from '@/config/demo.config';
import { guides } from '@/data/guides';
import { de } from '@/i18n/de';
import { caseAppliance, caseCategory, findingPattern } from '@/lib/appliance';
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
import { selectCaseFacts } from '@/model/policies/caseFacts';
import {
  isEmptyCase,
  planOpenCase,
  type OpenCaseArt,
  type OpenCaseOptions,
} from '@/model/policies/openCase';
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
  GuideRun,
  Household,
  Id,
  Person,
  Photo,
  Quote,
  VideoSession,
} from '@/model/types';

import { contractFromConfig, demoStartData } from './demoStart';
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
  dismissedHints: [],
};

export type NewDevice = Omit<Device, 'id' | 'householdId' | 'createdAt'>;

export type NotificationSetting = 'offen' | 'erlaubt' | 'abgelehnt';

/** Version des Texts zu Mitteilungen im Profil (de.profile.notifications) */
const NOTIFICATIONS_TEXT_VERSION = '2026-11-1';

/**
 * Empfänger der Einwilligung in Mitteilungen: ganz selbst als Absender. Lokale Mitteilungen
 * verlassen das Telefon nicht. PartnerKind kennt ganz noch nicht, Phase 3 fasst Empfänger neu.
 */
const NOTIFICATIONS_RECIPIENT = { id: 'ganz', kind: 'dienstleister', name: de.app.name } as const;

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
  nextCaseNumber: number;
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
  /** Legt den Vertrag aus der Konfiguration an (nach erfolgreicher Prüfung). */
  linkContract: (via: Contract['linkedVia']) => Contract;
  addDevice: (input: NewDevice) => Device;
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
   * ändert nichts, ganz fragt dann „Weitermachen“ oder „Neues Problem melden“.
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
   * der Meldung abgelehnt.
   */
  reportClaim: (caseId: Id, textVersion: string) => Result<Case>;
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
   * Antwort auf den Systemdialog oder den Schalter im Profil. „erlaubt“ speichert die Einwilligung
   * 'mitteilungen' (lit. a), alles andere widerruft sie (R-13).
   */
  setNotifications: (value: NotificationSetting) => void;
  /**
   * Nächster Schritt der Simulation: Freigabe, Bestätigung, unterwegs, repariert (BUILD_PLAN 5.1).
   * Ohne gültige Weitergabe für den Schritt passiert nichts, siehe simulationHold.
   */
  simulateNext: (caseId: Id) => boolean;
  /** Abschluss nach der Reparatur: „Läuft wieder“ oder „Problem besteht weiter“, nach den Regeln */
  confirmRepair: (caseId: Id, works: boolean) => Result<Case>;
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
  addEvent: (event: Omit<CaseEvent, 'id' | 'at'>) => CaseEvent;
  /** Nur Demo: alles auf den Anfang */
  reset: () => void;
  /** Demo-Steuerung: der feste Startstand für den Pitch, siehe store/demoStart.ts */
  loadDemoStart: () => void;
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

        /** Ein Ereignis in der Fallakte, ohne zu schreiben */
        const draftEvent = (input: Omit<CaseEvent, 'id' | 'at'>): CaseEvent => ({
          ...input,
          id: env.newId('ev'),
          at: env.now(),
        });

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
            commit(result.value);
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
            if (!(guideId in guides))
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
            const cfg = demoConfig;
            const partner = cfg.partners.find((p) => p.id === cfg.expert.partnerId)!;
            const now = env.now();
            const session: VideoSession = {
              id: env.newId('video'),
              caseId,
              expert: {
                name: cfg.expert.name,
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
            const actorName = by === 'fachkraft' ? cfg.expert.name : cfg.partners[0]!.name;
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
              actor: { kind: by, name: actorName },
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
              actor: { kind: by, name: actorName },
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

          reportClaim: (caseId, textVersion) => {
            const c = get().cases[caseId];
            if (!c) return missingCase(caseId);
            const device = get().devices.find((d) => d.id === c.deviceId);
            const contract = get().contracts.find((k) => k.id === device?.contractId);
            if (!contract) return refuse({ code: 'vertrag' });
            // Erst die Regel, dann die Bestätigung: Nach der Meldung entsteht keine zweite (R-02)
            if (!can(selectCaseFacts(get(), caseId), 'schaden_melden')) {
              return refuse({ code: 'regel', action: 'schaden_melden' });
            }
            const confirmed = draftConsent({
              caseId,
              purpose: 'weitergabe_versicherer',
              legalBasis: 'vertrag',
              recipient: contract.provider,
              dataCategories: [...de.consentData.versicherer],
              textVersion,
            });
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
            const partner = demoConfig.partners.find((p) => p.id === partnerId);
            if (!partner) return refuse({ code: 'unbekannt', what: 'betrieb', id: partnerId });
            // Selbst zahlen wechselt in die Reparatur, wo die Status-Maschine es erlaubt
            const paid =
              selfPay && canTransition(before.status, 'selbst_zahlen')
                ? draftCommand(before, 'selbst_zahlen')
                : undefined;
            if (paid && !paid.ok) return paid;
            const c = paid?.value.case ?? before;
            const provider = { id: partner.id, kind: 'betrieb' as const, name: partner.name };
            const confirmed = draftConsent({
              caseId,
              purpose: 'weitergabe_betrieb',
              legalBasis: 'vertrag',
              recipient: provider,
              dataCategories: [...de.consentData.betrieb],
              textVersion: '2026-10-1',
            });
            const booking: Booking = {
              id: env.newId('termin'),
              caseId,
              kind,
              provider: { ...provider, authorized: partner.authorized },
              slotLabel,
              status: 'angefragt',
              subjectToApproval: c.status === 'freigabe_noetig',
              address: get().household?.address,
              createdAt: env.now(),
            };
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
            // Status, Bestätigung, Termin und Ereignisse in einem Schritt
            set((s) => ({
              consents: [...s.consents, confirmed.consent],
              bookings: [
                ...s.bookings.map((b) =>
                  b.caseId === caseId && b.status === 'angefragt'
                    ? { ...b, status: 'storniert' as const }
                    : b,
                ),
                booking,
              ],
              cases: { ...s.cases, [caseId]: { ...c, bookingId: booking.id } },
              events: [...s.events, ...(paid?.value.events ?? []), ...confirmed.events, requested],
            }));
            return ok(booking);
          },

          setNotifications: (value) => {
            set({ notifications: value });
            if (value === 'erlaubt') {
              if (notificationsOn(get())) return;
              get().grantConsent({
                purpose: 'mitteilungen',
                legalBasis: 'einwilligung',
                recipient: { ...NOTIFICATIONS_RECIPIENT },
                dataCategories: [...de.consentData.mitteilungen],
                textVersion: NOTIFICATIONS_TEXT_VERSION,
              });
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
                  actor: { kind: 'versicherer', name: cfg.insurer.name },
                  decisionActor: 'mensch',
                  approvedAmount: approve ? quote?.repair.total : undefined,
                },
              );
              if (!decided.ok) return false;
              notify();
              return true;
            }
            if (!booking) return false;
            const confirmable =
              c.status === 'freigegeben' ||
              c.status === 'in_reparatur' ||
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
                setBooking({ status: 'erledigt' });
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
              setBooking({ status: 'erledigt', completionPhotoId: photo.id });
              get().addEvent({
                caseId,
                type: 'reparatur_abgeschlossen',
                actor: betrieb,
                payload: { bookingId: booking.id, photoId: photo.id },
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
            if (!can(selectCaseFacts(get(), caseId), action))
              return refuse({ code: 'regel', action });
            const result = draftCommand(c, works ? 'repariert' : 'problem_besteht_weiter');
            if (!result.ok) return result;
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
              cases: { ...s.cases, [caseId]: result.value.case },
              events: [...s.events, ...result.value.events, ...confirmed],
            }));
            return ok(result.value.case);
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

          addEvent: (input) => {
            const ev: CaseEvent = { ...input, id: env.newId('ev'), at: env.now() };
            set((s) => ({ events: [...s.events, ev] }));
            return ev;
          },

          // Die Darstellung ist eine Einstellung des Telefons, kein Demo-Stand
          reset: () => set({ ...initialData, appearance: get().appearance }),

          loadDemoStart: () => set({ ...demoStartData(initialData), appearance: get().appearance }),
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
          nextCaseNumber: s.nextCaseNumber,
        }),
      },
    ),
  );

  /**
   * „Zurücksetzen“ im Hinweis zum Wiederherstellen: sichert den gespeicherten Rohwert, löscht
   * ihn, setzt den Stand zurück und lädt neu. Lässt sich der Rohwert nicht sichern, wirft es,
   * bevor etwas gelöscht ist. Die Sicherungen bleiben.
   */
  const resetStoredState = async () => {
    await safeStorage.backupStored(STORE_KEY);
    await safeStorage.removeItem(STORE_KEY);
    store.getState().reset();
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
export function activeBooking(s: AppData, caseId: Id): Booking | undefined {
  return [...s.bookings].reverse().find((b) => b.caseId === caseId && b.status !== 'storniert');
}

const bookingEvents: CaseEvent['type'][] = [
  'termin_angefragt',
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
  if (!c) return undefined;
  if (simulationHold(s, caseId)) return undefined;
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
