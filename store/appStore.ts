// Zustand der App, mit persist auf AsyncStorage. Ein offener Fall übersteht den Neustart (B-03).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

import { demoConfig } from '@/config/demo.config';
import {
  applyCommand,
  isClosed,
  pauseCase as pause,
  resumeCase as resume,
  type CaseCommand,
  type CommandContext,
  type CommandResult,
} from '@/model/caseMachine';
import type {
  Booking,
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

export interface AppData {
  onboardingDone: boolean;
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
  createCase: (input: { deviceId: Id; entry: CaseEntry; problemLabel: string }) => Case;
  runCommand: (caseId: Id, command: CaseCommand, options?: CommandOptions) => Case;
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
        partialize: (s): AppData => ({
          onboardingDone: s.onboardingDone,
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

export function selectCaseEvents(s: AppData, caseId: Id): CaseEvent[] {
  return s.events.filter((e) => e.caseId === caseId);
}
