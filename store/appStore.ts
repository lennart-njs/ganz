// Zustand der App, mit persist auf AsyncStorage. Ein offener Fall übersteht den Neustart (B-03).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';
import { caseAppliance, caseCategory, findingPattern } from '@/lib/appliance';
import { notifications } from '@/services/notifications';
import {
  applyCommand,
  canStartVideoCall,
  canTransition,
  ConsentRequiredError,
  createQuote,
  isClosed,
  pauseCase as pause,
  resumeCase as resume,
  type CaseCommand,
  type CommandContext,
  type CommandResult,
} from '@/model/caseMachine';
import type {
  Booking,
  Cents,
  Case,
  CaseEntry,
  CaseEvent,
  ChatMessage,
  Consent,
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

import { defaultEnv, type StoreEnv } from './env';

export const STORE_KEY = 'ganz-app';
export const STORE_VERSION = 1;

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

export interface AppActions {
  /** Legt Haushalt und Person beim ersten Start an. Idempotent. */
  ensureHousehold: () => Person;
  completeOnboarding: () => void;
  /** Legt den Vertrag aus der Konfiguration an (nach erfolgreicher Prüfung). */
  linkContract: (via: Contract['linkedVia']) => Contract;
  addDevice: (input: NewDevice) => Device;
  setDemo: (patch: Partial<DemoSettings>) => void;
  createCase: (input: { deviceId: Id; entry: CaseEntry; problemLabel: string }) => Case;
  runCommand: (caseId: Id, command: CaseCommand, options?: CommandOptions) => Case;
  /** Ändert Einstieg oder Bezeichnung eines Falls, solange er offen ist */
  updateCase: (caseId: Id, patch: Partial<Pick<Case, 'entry' | 'problemLabel'>>) => void;
  /** Entfernt einen Fall ohne Inhalt (nur angelegt, kein Foto, kein Ergebnis, keine Anleitung) */
  discardIfEmpty: (caseId: Id) => void;
  setAppearance: (appearance: Appearance) => void;
  /** Nachricht im Chat. Eine Frage des Haushalts kommt als Ereignis in die Fallakte. */
  addChatMessage: (input: Omit<ChatMessage, 'id' | 'at'>) => ChatMessage;
  addDiagnosis: (input: Omit<Diagnosis, 'id' | 'createdAt'>) => Diagnosis;
  /** Foto aus der App-Kamera: Zeitstempel, Gerät, Zweck und Fall (B-16) */
  addPhoto: (input: Omit<Photo, 'id' | 'takenAt'>) => Photo;
  /** Startet eine Anleitung. Aus „offen“ wechselt der Fall in die Selbsthilfe. */
  startGuide: (caseId: Id, guideId: string) => GuideRun;
  /** Hilfe holen, wenn der Status es erlaubt. Sonst ohne Wirkung. */
  escalate: (caseId: Id) => void;
  /** Fragt einen Videocall an. Nur mit bestätigter Weitergabe an die Fachkraft (B-19). */
  requestVideoCall: (caseId: Id, screenshotsConsentId?: Id) => VideoSession;
  /** Ergebnis des Warteraums oder Ende des Calls */
  updateVideoCall: (
    sessionId: Id,
    change: 'verbunden' | 'keine_fachkraft' | 'abgebrochen' | 'beendet',
  ) => void;
  requestCallback: (caseId: Id, slot: string) => void;
  /** Meldet den Schadenfall: speichert die Bestätigung und wechselt auf „freigabe_noetig“ (B-17) */
  reportClaim: (caseId: Id, textVersion: string) => Case;
  /** Termin anfragen. Die Pumpe geht nie an den Haushalt (B-28). */
  requestBooking: (input: {
    caseId: Id;
    kind: Booking['kind'];
    partnerId: string;
    slotLabel: string;
    selfPay: boolean;
    partName?: string;
  }) => Booking;
  setNotifications: (value: NotificationSetting) => void;
  /** Nächster Schritt der Simulation: Freigabe, Bestätigung, unterwegs, repariert (BUILD_PLAN 5.1) */
  simulateNext: (caseId: Id) => boolean;
  /** Abschluss nach der Reparatur: „Läuft wieder“ oder „Problem besteht weiter“ */
  confirmRepair: (caseId: Id, works: boolean) => void;
  rateBooking: (bookingId: Id, stars: 1 | 2 | 3 | 4 | 5) => void;
  /** Befund der Fachkraft oder des Betriebs, bei Reparatur mit Kostenvoranschlag */
  setFinding: (
    caseId: Id,
    option: 'geloest' | 'reparatur' | 'ersatzgeraet',
    by: 'fachkraft' | 'betrieb',
  ) => void;
  /** Schritt erledigt oder Schritt zurück. Der Fortschritt bleibt gespeichert (B-05). */
  moveGuideStep: (runId: Id, direction: 'next' | 'back') => void;
  /** Sicherheitshinweis bestätigt, z. B. „Der Wasserhahn ist zu“ (Q-13) */
  confirmSafety: (runId: Id, step: number) => void;
  /** Beendet die Anleitung. „Geht nicht“ speichert den Abbruchschritt und die Notiz (B-06). */
  finishGuide: (runId: Id, outcome: NonNullable<GuideRun['outcome']>, note?: string) => void;
  pauseCase: (caseId: Id) => void;
  resumeCase: (caseId: Id) => void;
  grantConsent: (input: NewConsent) => Consent;
  revokeConsent: (consentId: Id) => void;
  addEvent: (event: Omit<CaseEvent, 'id' | 'at'>) => CaseEvent;
  /** Nur Demo: alles auf den Anfang */
  reset: () => void;
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
  return create<AppState>()(
    persist(
      (set, get) => {
        const person = (): Person => get().ensureHousehold();
        const householdActor = (): CaseEvent['actor'] => ({ kind: 'haushalt', id: person().id });

        const commit = (result: CommandResult) =>
          set((s) => ({
            cases: { ...s.cases, [result.case.id]: result.case },
            events: [...s.events, ...result.events],
          }));

        const getCase = (caseId: Id): Case => {
          const c = get().cases[caseId];
          if (!c) throw new Error(`Fall nicht gefunden: ${caseId}`);
          return c;
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

          linkContract: (via) => {
            const p = person();
            const now = env.now();
            const cfg = demoConfig;
            const contract: Contract = {
              id: env.newId('vertrag'),
              householdId: get().household?.id ?? '',
              kind: cfg.contract.kind,
              provider: { id: cfg.insurer.id, kind: 'versicherer', name: cfg.insurer.name },
              soldBy: { id: cfg.dealer.id, kind: 'haendler', name: cfg.dealer.name },
              productName: cfg.contract.productName,
              contractNumber: cfg.contract.number,
              policyholderId: p.id,
              validFrom: cfg.contract.validFrom,
              validUntil: cfg.contract.validUntil,
              deductible: get().demo.deductible,
              coveredDeviceIds: [],
              linkedVia: via,
              linkedAt: now,
            };
            // Geräte aus dem Vertrag, die schon in der App sind, gehören dazu.
            const covered = get().devices.filter(
              (d) => d.manufacturerId === cfg.manufacturer.id && d.model === cfg.device.model,
            );
            contract.coveredDeviceIds = covered.map((d) => d.id);
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

          runCommand: (caseId, command, options = {}) => {
            const result = applyCommand(getCase(caseId), command, {
              ...options,
              actor: options.actor ?? householdActor(),
              now: env.now(),
              newId: env.newId,
              consents: get().consents,
            });
            commit(result);
            return result.case;
          },

          updateCase: (caseId, patch) =>
            set((s) => {
              const c = s.cases[caseId];
              if (!c || c.status !== 'offen') return {};
              return { cases: { ...s.cases, [caseId]: { ...c, ...patch, updatedAt: env.now() } } };
            }),

          setAppearance: (appearance) => set({ appearance }),

          discardIfEmpty: (caseId) =>
            set((s) => {
              const c = s.cases[caseId];
              const empty =
                c &&
                c.status === 'offen' &&
                !c.photoIds.length &&
                !c.diagnosisIds.length &&
                !c.guideRunIds.length &&
                !s.chatMessages.some((m) => m.caseId === caseId);
              if (!empty) return {};
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
            const d: Diagnosis = { ...input, id: env.newId('ergebnis'), createdAt: env.now() };
            const c = getCase(input.caseId);
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
            // Befunde von Fachkraft oder Betrieb haben ein eigenes Ereignis (befund_erstellt)
            const isResult = d.source === 'fehlererkennung' || d.source === 'nutzerangabe';
            set((s) => ({
              diagnoses: [...s.diagnoses, d],
              cases: {
                ...s.cases,
                [c.id]: { ...c, diagnosisIds: [...c.diagnosisIds, d.id], updatedAt: d.createdAt },
              },
              events: isResult ? [...s.events, ev] : s.events,
            }));
            return d;
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
            const now = env.now();
            const run: GuideRun = {
              id: env.newId('anleitung'),
              caseId,
              guideId,
              startedAt: now,
              currentStep: 0,
              completedSteps: [],
            };
            const before = getCase(caseId);
            if (before.status === 'offen') {
              get().runCommand(caseId, 'anleitung_starten');
            }
            const c = getCase(caseId);
            set((s) => ({
              guideRuns: { ...s.guideRuns, [run.id]: run },
              cases: { ...s.cases, [caseId]: { ...c, guideRunIds: [...c.guideRunIds, run.id] } },
              events:
                before.status === 'offen'
                  ? s.events.map((e) =>
                      e.caseId === caseId && e.type === 'anleitung_gestartet' && !e.payload.guideId
                        ? { ...e, payload: { ...e.payload, guideId, guideRunId: run.id } }
                        : e,
                    )
                  : [
                      ...s.events,
                      {
                        id: env.newId('ev'),
                        caseId,
                        type: 'anleitung_gestartet',
                        at: now,
                        actor: householdActor(),
                        payload: { guideId, guideRunId: run.id },
                      },
                    ],
            }));
            return run;
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
            if (!run || run.endedAt) return;
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
            set((s) => ({
              guideRuns: { ...s.guideRuns, [runId]: ended },
              events: [...s.events, ...events],
            }));
            const c = getCase(run.caseId);
            if (outcome === 'laeuft_wieder' || outcome === 'fertig') {
              if (canTransition(c.status, 'selbst_geloest')) {
                get().runCommand(c.id, 'selbst_geloest', {
                  resolution: c.entry === 'pflege' ? 'pflege_erledigt' : undefined,
                });
              }
            } else {
              get().escalate(c.id);
            }
          },

          requestVideoCall: (caseId, screenshotsConsentId) => {
            const c = getCase(caseId);
            if (!canStartVideoCall(get().consents, c.reportedBy, caseId)) {
              throw new ConsentRequiredError('weitergabe_fachkraft');
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
              screenshotsConsentId,
            };
            set((s) => ({ videoSessions: [...s.videoSessions, session] }));
            get().addEvent({
              caseId,
              type: 'videocall_angefragt',
              actor: householdActor(),
              payload: { sessionId: session.id, expert: session.expert.name },
            });
            return session;
          },

          updateVideoCall: (sessionId, change) => {
            const session = get().videoSessions.find((v) => v.id === sessionId);
            if (!session) return;
            const now = env.now();
            let next: VideoSession = session;
            if (change === 'verbunden') {
              // Auch beim Verbinden gilt: nur mit gültiger Bestätigung
              const c = getCase(session.caseId);
              if (!canStartVideoCall(get().consents, c.reportedBy, c.id)) {
                throw new ConsentRequiredError('weitergabe_fachkraft');
              }
              next = { ...session, startedAt: now, outcome: 'verbunden' };
            } else if (change === 'beendet') {
              next = { ...session, endedAt: now };
            } else {
              next = { ...session, endedAt: now, outcome: change };
            }
            set((s) => ({
              videoSessions: s.videoSessions.map((v) => (v.id === sessionId ? next : v)),
            }));
            get().addEvent({
              caseId: session.caseId,
              type: change === 'verbunden' ? 'videocall_gestartet' : 'videocall_beendet',
              actor:
                change === 'verbunden'
                  ? { kind: 'fachkraft', name: session.expert.name }
                  : householdActor(),
              payload: { sessionId, outcome: next.outcome, change },
            });
          },

          requestCallback: (caseId, slot) =>
            void get().addEvent({
              caseId,
              type: 'videocall_angefragt',
              actor: householdActor(),
              payload: { art: 'rueckruf', slot },
            }),

          setFinding: (caseId, option, by) => {
            const cfg = demoConfig;
            const c = getCase(caseId);
            const actorName = by === 'fachkraft' ? cfg.expert.name : cfg.partners[0]!.name;
            const d = get().addDiagnosis({
              caseId,
              photoIds: [],
              mode: 'bauteil',
              errorPattern:
                option === 'geloest'
                  ? 'im_call_geloest'
                  : option === 'ersatzgeraet'
                    ? 'ersatzgeraet_noetig'
                    : findingPattern(caseCategory(get(), caseId)),
              component:
                option === 'geloest' ? undefined : caseAppliance(get(), caseId).finding.component,
              confidence: 'hoch',
              confidenceScore: 1,
              source: by,
            });
            get().addEvent({
              caseId,
              type: 'befund_erstellt',
              actor: { kind: by, name: actorName },
              payload: { diagnosisId: d.id, option },
            });
            if (option === 'geloest') {
              if (canTransition(c.status, 'im_call_geloest'))
                get().runCommand(caseId, 'im_call_geloest');
              return;
            }
            const device = get().devices.find((x) => x.id === c.deviceId);
            const contract = get().contracts.find((k) => k.id === device?.contractId);
            const quote = createQuote({
              id: env.newId('angebot'),
              caseId,
              createdBy: { kind: by, name: actorName },
              repair: {
                partName: caseAppliance(get(), caseId).finding.component,
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
            set((s) => ({
              quotes: [...s.quotes, quote],
              cases: { ...s.cases, [caseId]: { ...getCase(caseId), quoteId: quote.id } },
            }));
            get().addEvent({
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
          },

          reportClaim: (caseId, textVersion) => {
            const c = getCase(caseId);
            const device = get().devices.find((d) => d.id === c.deviceId);
            const contract = get().contracts.find((k) => k.id === device?.contractId);
            if (!contract) throw new Error('Kein Vertrag für dieses Gerät');
            get().grantConsent({
              caseId,
              purpose: 'weitergabe_versicherer',
              legalBasis: 'vertrag',
              recipient: contract.provider,
              dataCategories: [...de.consentData.versicherer],
              textVersion,
            });
            return get().runCommand(caseId, 'schaden_melden', { contractId: contract.id });
          },

          requestBooking: ({ caseId, kind, partnerId, slotLabel, selfPay, partName }) => {
            // Ökodesign: Pumpen sind Teile für fachlich kompetente Reparateure, nicht für Endnutzer
            const pumpOrSensor = Object.values(de.appliance).some(
              (a) => a.finding.component === partName,
            );
            if (kind === 'ersatzteil_versand' && pumpOrSensor) {
              throw new Error(`${partName} bestellt und baut immer der Betrieb ein`);
            }
            const partner = demoConfig.partners.find((p) => p.id === partnerId);
            if (!partner) throw new Error(`Betrieb nicht gefunden: ${partnerId}`);
            let c = getCase(caseId);
            if (selfPay && canTransition(c.status, 'selbst_zahlen')) {
              c = get().runCommand(caseId, 'selbst_zahlen');
            }
            const provider = { id: partner.id, kind: 'betrieb' as const, name: partner.name };
            get().grantConsent({
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
            set((s) => ({
              bookings: [
                ...s.bookings.map((b) =>
                  b.caseId === caseId && b.status === 'angefragt'
                    ? { ...b, status: 'storniert' as const }
                    : b,
                ),
                booking,
              ],
              cases: { ...s.cases, [caseId]: { ...getCase(caseId), bookingId: booking.id } },
            }));
            get().addEvent({
              caseId,
              type: 'termin_angefragt',
              actor: householdActor(),
              payload: {
                bookingId: booking.id,
                kind,
                partner: partner.name,
                slot: slotLabel,
                subjectToApproval: booking.subjectToApproval,
              },
            });
            return booking;
          },

          setNotifications: (value) => set({ notifications: value }),

          simulateNext: (caseId) => {
            const cfg = demoConfig;
            const c = get().cases[caseId];
            if (!c) return false;
            const booking = activeBooking(get(), caseId);
            const insurer = cfg.insurer.shortName;
            const partner = booking?.provider.name ?? '';
            const notify = (msg: { title: string; body: string }) => {
              if (get().notifications === 'erlaubt')
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
              get().runCommand(caseId, approve ? 'freigabe_erteilt' : 'freigabe_abgelehnt', {
                actor: { kind: 'versicherer', name: cfg.insurer.name },
                decisionActor: 'mensch',
                approvedAmount: approve ? quote?.repair.total : undefined,
              });
              notify(approve ? de.notify.freigegeben(insurer) : de.notify.abgelehnt(insurer));
              return true;
            }
            if (!booking) return false;
            const confirmable =
              c.status === 'freigegeben' ||
              c.status === 'in_reparatur' ||
              (c.status === 'eskaliert' && booking.kind === 'vor_ort_diagnose');
            if (booking.status === 'angefragt' && confirmable) {
              setBooking({ status: 'bestaetigt' });
              if (c.status === 'freigegeben') {
                get().runCommand(caseId, 'termin_bestaetigt', { actor: betrieb });
              } else {
                get().addEvent({
                  caseId,
                  type: 'termin_bestaetigt',
                  actor: betrieb,
                  payload: { bookingId: booking.id },
                });
              }
              notify(de.notify.bestaetigt(partner, booking.slotLabel));
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
              notify(de.notify.unterwegs(partner));
              return true;
            }
            if (booking.status === 'unterwegs') {
              if (booking.kind === 'vor_ort_diagnose') {
                setBooking({ status: 'erledigt' });
                get().setFinding(caseId, 'reparatur', 'betrieb');
                notify(de.notify.diagnose(caseAppliance(get(), caseId).examined(partner)));
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
              notify(de.notify.repariert(partner, caseAppliance(get(), caseId).runsAgain));
              return true;
            }
            return false;
          },

          confirmRepair: (caseId, works) => {
            const c = getCase(caseId);
            if (works) {
              if (canTransition(c.status, 'repariert')) get().runCommand(caseId, 'repariert');
              get().addEvent({
                caseId,
                type: 'abschluss_bestaetigt',
                actor: householdActor(),
                payload: {},
              });
            } else if (canTransition(c.status, 'problem_besteht_weiter')) {
              get().runCommand(caseId, 'problem_besteht_weiter');
            }
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

          escalate: (caseId) => {
            const c = getCase(caseId);
            if (canTransition(c.status, 'hilfe_holen')) get().runCommand(caseId, 'hilfe_holen');
          },

          pauseCase: (caseId) =>
            commit(
              pause(getCase(caseId), { actor: householdActor(), now: env.now(), newId: env.newId }),
            ),

          resumeCase: (caseId) =>
            commit(
              resume(getCase(caseId), {
                actor: householdActor(),
                now: env.now(),
                newId: env.newId,
              }),
            ),

          grantConsent: (input) => {
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
        };
      },
      {
        name: STORE_KEY,
        version: STORE_VERSION,
        storage: createJSONStorage(() => storage),
        // Neue Einstellungen ergänzen gespeicherte Stände, statt sie zu verlieren.
        merge: (persisted, current) => {
          const p = (persisted ?? {}) as Partial<AppData>;
          return { ...current, ...p, demo: { ...current.demo, ...p.demo } };
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

/** Wann der nächste simulierte Schritt fällig ist (ms seit 1970). Ohne nächsten Schritt: undefined. */
export function nextSimulationDue(s: AppData, caseId: Id): number | undefined {
  const c = s.cases[caseId];
  if (!c) return undefined;
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

export function selectContract(s: AppData): Contract | undefined {
  return s.contracts[0];
}

export function selectDevice(s: AppData, id: Id | undefined): Device | undefined {
  return s.devices.find((d) => d.id === id);
}

/** Offener Fall eines Geräts, neuester zuerst */
export function selectOpenCaseForDevice(s: AppData, deviceId: Id): Case | undefined {
  return selectOpenCases(s).find((c) => c.deviceId === deviceId);
}

export function selectCaseEvents(s: AppData, caseId: Id): CaseEvent[] {
  return s.events.filter((e) => e.caseId === caseId);
}
