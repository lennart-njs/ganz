// Zustand der App, mit persist auf AsyncStorage. Ein offener Fall übersteht den Neustart (B-03).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

import { demoConfig } from '@/config/demo.config';
import {
  applyCommand,
  canTransition,
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
}

export const defaultDemoSettings: DemoSettings = {
  hints: demoConfig.demo.hints,
  scanScenario: 'erkannt',
  diagnosisScenario: 'standard',
  videoScenario: 'verbunden',
  claimScenario: 'freigeben',
  deductible: demoConfig.contract.deductible,
};

export type NewDevice = Omit<Device, 'id' | 'householdId' | 'createdAt'>;

export interface AppData {
  onboardingDone: boolean;
  demo: DemoSettings;
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
  addDiagnosis: (input: Omit<Diagnosis, 'id' | 'createdAt'>) => Diagnosis;
  /** Foto aus der App-Kamera: Zeitstempel, Gerät, Zweck und Fall (B-16) */
  addPhoto: (input: Omit<Photo, 'id' | 'takenAt'>) => Photo;
  /** Startet eine Anleitung. Aus „offen“ wechselt der Fall in die Selbsthilfe. */
  startGuide: (caseId: Id, guideId: string) => GuideRun;
  /** Hilfe holen, wenn der Status es erlaubt. Sonst ohne Wirkung. */
  escalate: (caseId: Id) => void;
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
  demo: defaultDemoSettings,
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

          setDemo: (patch) => set((s) => ({ demo: { ...s.demo, ...patch } })),

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

          discardIfEmpty: (caseId) =>
            set((s) => {
              const c = s.cases[caseId];
              const empty =
                c &&
                c.status === 'offen' &&
                !c.photoIds.length &&
                !c.diagnosisIds.length &&
                !c.guideRunIds.length;
              if (!empty) return {};
              const { [caseId]: _removed, ...cases } = s.cases;
              return { cases, events: s.events.filter((e) => e.caseId !== caseId) };
            }),

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
            set((s) => ({
              diagnoses: [...s.diagnoses, d],
              cases: {
                ...s.cases,
                [c.id]: { ...c, diagnosisIds: [...c.diagnosisIds, d.id], updatedAt: d.createdAt },
              },
              events: [...s.events, ev],
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
            const ev: CaseEvent = {
              id: env.newId('ev'),
              caseId: target.caseId ?? '',
              type: 'einwilligung_widerrufen',
              at: now,
              actor: householdActor(),
              payload: { consentId, purpose: target.purpose },
            };
            set((s) => ({
              consents: s.consents.map((c) => (c.id === consentId ? { ...c, revokedAt: now } : c)),
              events: [...s.events, ev],
            }));
          },

          addEvent: (input) => {
            const ev: CaseEvent = { ...input, id: env.newId('ev'), at: env.now() };
            set((s) => ({ events: [...s.events, ev] }));
            return ev;
          },

          reset: () => set({ ...initialData }),
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
          demo: s.demo,
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
