// Fuzz-Test über den echten Store (Schritt 24, ZUKUNFTSPLAN Phase 1 „Befehle ohne Absturz“).
// Jede Folge wählt ihre Schritte aus dem, was gerade möglich ist: availableActions je Fall,
// „Problem melden“ je Gerät und die Welt draußen (Simulation, Call, Befund, Widerruf).
// Kein Schritt darf werfen. Je Gerät gibt es höchstens einen offenen Fall, je Fall höchstens
// eine offene Anleitung und je Art höchstens einen Termin, der zählt. Eine Ablehnung ändert nichts.
import { array, assert, boolean, constantFrom, integer, nat, property } from 'fast-check';
import type { StateStorage } from 'zustand/middleware';

import { demoConfig } from '@/config/demo.config';
import { ALL_ACTIONS, availableActions, type ActionKey } from '@/model/policies/actions';
import { selectCaseFacts, type CaseFacts } from '@/model/policies/caseFacts';
import type { OpenCaseOptions } from '@/model/policies/openCase';
import type { Case, CaseEntry } from '@/model/types';
import {
  createAppStore,
  selectOpenCases,
  type AppState,
  type AppStore,
  type NewConsent,
} from '@/store/appStore';
import type { StoreEnv } from '@/store/env';
import { unwrap } from '@/test/result';

/** Zahl der Folgen. Mit FUZZ_SEED=<Zahl> läuft eine andere, wiederholbare Auswahl. */
const RUNS = 1000;
const SEED = Number(process.env.FUZZ_SEED ?? 20261103);

/** Speicher ohne Inhalt: persist schreibt, behält aber nichts */
const nowhere: StateStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

function testEnv(): StoreEnv {
  let n = 0;
  let t = Date.parse(demoConfig.demo.startAt);
  return {
    now: () => new Date((t += 1000)).toISOString(),
    newId: (p) => `${p}-${++n}`,
  };
}

interface Step {
  /** ActionKey, wenn der Schritt eine Aktion des Haushalts ist */
  action?: ActionKey;
  name: string;
  run: (s: AppState) => unknown;
}

const OPENINGS: [CaseEntry, string, OpenCaseOptions][] = [
  ['symptom', 'Wäsche noch nass', { guideId: 'nass' }],
  ['foto', 'Foto vom Display', {}],
  ['symptom', 'Tür geht nicht auf', { guideId: 'tuer', neuesProblem: true }],
  ['pflege', 'Hygiene-Programm', { guideId: 'hygiene' }],
];

const partners = demoConfig.partners.map((p) => p.id);

/** Die Bestätigung an die Fachkraft, die der Tap auf „Videocall starten“ erteilt */
function share(caseId: string): NewConsent {
  const partner = demoConfig.partners.find((p) => p.id === demoConfig.expert.partnerId)!;
  return {
    caseId,
    purpose: 'weitergabe_fachkraft',
    legalBasis: 'vertrag',
    recipient: { id: partner.id, kind: 'betrieb', name: partner.name },
    dataCategories: ['Fotos'],
    textVersion: '1',
  };
}

/** Was der Haushalt mit einer Aktion im Store auslöst, wie die Screens */
function household(key: ActionKey, c: Case, f: CaseFacts, s: AppState): Step[] {
  const step = (name: string, run: (s: AppState) => unknown): Step => ({ action: key, name, run });
  const id = c.id;
  const booking = (kind: 'reparatur' | 'vor_ort_diagnose', selfPay: boolean) =>
    partners.map((partnerId) =>
      step(`${key} ${partnerId}`, (x) =>
        x.requestBooking({
          caseId: id,
          kind,
          partnerId,
          slotLabel: demoConfig.slots[0]!,
          selfPay,
          partName: f.quote?.repair.partName,
        }),
      ),
    );
  switch (key) {
    case 'problem_aendern':
      return [
        step(key, (x) =>
          x.openCaseFor(c.deviceId, 'symptom', 'Tür geht nicht auf', {
            aendern: id,
            guideId: 'tuer',
          }),
        ),
      ];
    case 'anleitung_starten':
      return ['ablauf', 'nass'].map((g) => step(`${key} ${g}`, (x) => x.startGuide(id, g)));
    case 'anleitung_fortsetzen': {
      const run = f.guideRun!;
      return [
        step(`${key} weiter`, (x) => x.moveGuideStep(run.id, 'next')),
        step(`${key} läuft wieder`, (x) => x.finishGuide(run.id, 'laeuft_wieder')),
        step(`${key} geht nicht`, (x) => x.finishGuide(run.id, 'geht_nicht', 'klemmt')),
      ];
    }
    case 'hilfe_holen':
      return [step(key, (x) => x.escalate(id))];
    case 'videocall_anfragen':
      return [step(key, (x) => x.requestVideoCall(id, { share: share(id) }))];
    case 'rueckruf_anfragen':
      return [step(key, (x) => x.requestCallback(id, demoConfig.slots[1]!))];
    case 'termin_diagnose':
      return booking('vor_ort_diagnose', false);
    case 'schaden_melden':
      return [step(key, (x) => x.reportClaim(id))];
    case 'selbst_zahlen':
    case 'selbst_zahlen_nach_ablehnung':
    case 'termin_selbst':
      return booking('reparatur', true);
    case 'termin_versicherer':
      return booking('reparatur', false);
    case 'reparatur_bestaetigen':
      return [step(key, (x) => x.confirmRepair(id, true))];
    case 'problem_besteht_weiter':
      return [step(key, (x) => x.confirmRepair(id, false))];
    case 'bewerten': {
      const b = f.bookings.reparatur;
      return b ? [step(key, (x) => x.rateBooking(b.id, 5))] : [];
    }
    case 'weitergabe_erneuern':
      return [step(key, (x) => x.renewTransfer(id))];
    case 'pausieren':
      return [step(key, (x) => x.pauseCase(id))];
    case 'abbrechen':
      return [step(key, (x) => x.runCommand(id, 'abbrechen', { cancelReason: 'Fuzz' }))];
  }
}

/** Was außerhalb des Telefons passiert: Versicherer, Betrieb, Fachkraft, Widerruf in der Fallakte */
function world(c: Case, f: CaseFacts, s: AppState): Step[] {
  const id = c.id;
  const steps: Step[] = [{ name: 'simulation', run: (x) => x.simulateNext(id) }];
  const v = f.lastVideoSession;
  if (v && !v.endedAt) {
    for (const change of ['verbunden', 'keine_fachkraft', 'beendet'] as const) {
      steps.push({ name: `call ${change}`, run: (x) => x.updateVideoCall(v.id, change) });
    }
  }
  // Befund nach einem Call, wie im Gespräch
  if (v?.outcome === 'verbunden' && availableActions(f).includes('videocall_anfragen')) {
    for (const option of ['geloest', 'reparatur', 'ersatzgeraet'] as const) {
      steps.push({ name: `befund ${option}`, run: (x) => x.setFinding(id, option, 'fachkraft') });
    }
  }
  for (const consent of s.consents.filter((k) => k.caseId === id && !k.revokedAt)) {
    steps.push({ name: `widerruf ${consent.purpose}`, run: (x) => x.revokeConsent(consent.id) });
  }
  if (c.pausedAt) steps.push({ name: 'fortsetzen', run: (x) => x.resumeCase(id) });
  return steps;
}

/**
 * Was jetzt möglich ist, in Gruppen: „Problem melden“ für die Geräte, dann je Fall seine Aktionen
 * und die Welt draußen. Erst wählt die Folge die Gruppe, dann den Schritt. So kommen auch lange
 * Wege in einem Fall vor, statt dass neue Meldungen die Auswahl füllen.
 */
function menu(store: AppStore): Step[][] {
  const s = store.getState();
  const opening: Step[] = s.devices.flatMap((d) =>
    OPENINGS.map(([entry, label, options]) => ({
      name: `melden ${entry}`,
      run: (x: AppState) => x.openCaseFor(d.id, entry, label, options),
    })),
  );
  const perCase = Object.values(s.cases).map((c) => {
    const f = selectCaseFacts(s, c.id)!;
    return [...availableActions(f).flatMap((key) => household(key, c, f, s)), ...world(c, f, s)];
  });
  return [opening, ...perCase].filter((g) => g.length > 0);
}

const pick = (groups: Step[][], choice: number): Step => {
  const group = groups[choice % groups.length]!;
  return group[Math.floor(choice / groups.length) % group.length]!;
};

/** Womit eine Folge beginnt. Jeder Stand entsteht über dieselben Befehle wie in der App. */
type Start = 'leer' | 'befund' | 'gemeldet' | 'diagnose' | 'reparatur';
const STARTS: Start[] = ['leer', 'befund', 'gemeldet', 'diagnose', 'reparatur'];

function setup(
  start: Start,
  contract: boolean,
  devices: number,
  claimScenario: 'freigeben' | 'ablehnen',
) {
  const store = createAppStore(nowhere, testEnv());
  const s = () => store.getState();
  s().ensureHousehold();
  s().setDemo({ claimScenario });
  if (contract) s().linkContract('vertragsnummer');
  for (let i = 0; i < devices; i++) {
    s().addDevice({
      manufacturerId: demoConfig.manufacturer.id,
      category: 'waschmaschine',
      model: demoConfig.device.model,
      identifiedBy: 'vertrag',
      contractId: s().contracts[0]?.id,
    });
  }
  if (start === 'leer') return store;
  const id = unwrap(s().openCaseFor(s().devices[0]!.id, 'foto', 'Foto vom Display')).caseId;
  unwrap(s().escalate(id));
  const booking = (kind: 'reparatur' | 'vor_ort_diagnose', selfPay: boolean) =>
    unwrap(
      s().requestBooking({
        caseId: id,
        kind,
        partnerId: partners[0]!,
        slotLabel: demoConfig.slots[0]!,
        selfPay,
      }),
    );
  if (start === 'diagnose') {
    booking('vor_ort_diagnose', false);
    return store;
  }
  // Videocall mit Befund „Reparatur“ und Kostenvoranschlag
  const call = unwrap(s().requestVideoCall(id, { share: share(id) }));
  unwrap(s().updateVideoCall(call.id, 'verbunden'));
  unwrap(s().updateVideoCall(call.id, 'beendet'));
  unwrap(s().setFinding(id, 'reparatur', 'fachkraft'));
  if (start === 'gemeldet' && contract) unwrap(s().reportClaim(id));
  if (start === 'reparatur') {
    // Selbst gezahlt, der Betrieb ist fertig
    booking('reparatur', true);
    while (s().simulateNext(id));
  }
  return store;
}

/**
 * Je Gerät höchstens ein offener Fall (Nr. 13), je Fall höchstens eine offene Anleitung (B-05)
 * und je Art und Runde höchstens ein Termin, der zählt (R-08). Ein Termin vorbehaltlich Freigabe, der nach
 * der Ablehnung nur angefragt ist, zählt nicht mehr. Gibt den ersten Verstoß zurück. Ohne expect
 * je Schritt, damit 1.000 Folgen schnell laufen.
 */
function violation(s: AppState): string | undefined {
  const devices = new Set<string>();
  for (const c of selectOpenCases(s)) {
    if (devices.has(c.deviceId)) return `zwei offene Fälle für ${c.deviceId}`;
    devices.add(c.deviceId);
  }
  for (const c of Object.values(s.cases)) {
    const running = c.guideRunIds.filter((r) => s.guideRuns[r] && !s.guideRuns[r].endedAt);
    if (running.length > 1) return `zwei offene Anleitungen in ${c.id}`;
    // Je Runde (model/policies/rounds.ts): jede frühere für sich und die laufende. Jeder Termin
    // des Falls gehört zu genau einer Runde.
    const own = s.bookings.filter((b) => b.caseId === c.id);
    const rounds = c.rounds ?? [];
    const archived = rounds.flatMap((r) => r.bookingIds);
    if (new Set(archived).size < archived.length) return `Termin in zwei Runden in ${c.id}`;
    if (archived.some((id) => !own.some((b) => b.id === id)))
      return `Runde mit fremdem Termin in ${c.id}`;
    const groups = [
      ...rounds.map((r) => ({ ids: r.bookingIds, claim: r.claim })),
      { ids: own.filter((b) => !archived.includes(b.id)).map((b) => b.id), claim: c.claim },
    ];
    for (const g of groups) {
      const rejected = g.claim?.decision?.result === 'abgelehnt';
      const kinds = own
        .filter(
          (b) =>
            g.ids.includes(b.id) &&
            b.status !== 'storniert' &&
            !(rejected && b.subjectToApproval && b.status === 'angefragt'),
        )
        .map((b) => b.kind);
      if (new Set(kinds).size < kinds.length) return `zwei Termine derselben Art in ${c.id}`;
    }
  }
  return undefined;
}

const isRefused = (r: unknown): boolean =>
  typeof r === 'object' && r !== null && 'ok' in r && (r as { ok: unknown }).ok === false;

test('1.000 zufällige Folgen aus availableActions: keine Exception, je Gerät höchstens ein offener Fall', () => {
  const seen = new Set<ActionKey>();
  let steps = 0;
  assert(
    property(
      constantFrom(...STARTS),
      boolean(),
      integer({ min: 1, max: 2 }),
      constantFrom('freigeben' as const, 'ablehnen' as const),
      array(nat(), { minLength: 5, maxLength: 25, size: 'max' }),
      (start, contract, devices, claimScenario, choices) => {
        const store = setup(start, contract, devices, claimScenario);
        const trail: string[] = [start];
        for (const choice of choices) {
          const step = pick(menu(store), choice);
          const before = store.getState();
          const result = step.run(before);
          trail.push(step.name);
          steps += 1;
          if (step.action) seen.add(step.action);
          // Eine Ablehnung schreibt nichts
          const problem =
            isRefused(result) && store.getState() !== before
              ? `Ablehnung hat geschrieben: ${step.name}`
              : violation(store.getState());
          if (problem) throw new Error(`${problem} nach ${trail.join(' → ')}`);
        }
      },
    ),
    { numRuns: RUNS, seed: SEED },
  );
  expect(steps).toBeGreaterThanOrEqual(RUNS * 10);
  // Die Folgen kommen überall hin: Jede Aktion des Haushalts lief mindestens einmal
  expect(ALL_ACTIONS.filter((a) => !seen.has(a))).toEqual([]);
});
