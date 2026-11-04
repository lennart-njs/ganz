// Form des gespeicherten Stands. merge prüft sie beim Laden, bevor die App etwas davon zeigt.
// Das Schema folgt AppData und den Typen in model/types.ts. Weicht eine Seite ab, meldet tsc
// einen Fehler (SchemaPasstZuAppData unten).
import { z } from 'zod';

import type { AppData } from './appStore';
import { StoreLoadError } from './persistence';

const id = z.string();
const time = z.string();
const cents = z.number();

const address = z.object({ street: z.string(), zip: z.string(), city: z.string() });

const person = z.object({
  id,
  displayName: z.string(),
  email: z.string().optional(),
  role: z.enum(['versicherungsnehmer', 'mitglied']),
});

const household = z.object({
  id,
  members: z.array(person),
  address: address.optional(),
  createdAt: time,
});

const partnerRef = z.object({
  id,
  kind: z.enum(['versicherer', 'haendler', 'hersteller', 'betrieb', 'dienstleister']),
  name: z.string(),
});

const contract = z.object({
  id,
  householdId: id,
  kind: z.enum(['garantieverlaengerung', 'geraeteversicherung', 'herstellergarantie']),
  provider: partnerRef,
  soldBy: partnerRef.optional(),
  productName: z.string(),
  contractNumber: z.string(),
  policyholderId: id,
  validFrom: time,
  validUntil: time,
  deductible: cents,
  coveredDeviceIds: z.array(id),
  linkedVia: z.enum(['vertragsnummer', 'haendler_code']),
  linkedAt: time,
});

const device = z.object({
  id,
  householdId: id,
  manufacturerId: id,
  category: z.enum(['waschmaschine', 'geschirrspueler', 'trockner', 'kuehlschrank']),
  model: z.string(),
  materialNumber: z.string().optional(),
  serialNumber: z.string().optional(),
  purchaseDate: time.optional(),
  purchaseProofPhotoId: id.optional(),
  contractId: id.optional(),
  identifiedBy: z.enum(['typenschild_scan', 'manuell', 'vertrag']),
  createdAt: time,
});

const claim = z.object({
  contractId: id,
  reportedAt: time,
  reportedBy: id,
  confirmationId: id,
  decision: z
    .object({
      result: z.enum(['freigegeben', 'abgelehnt', 'rueckfrage']),
      at: time,
      actor: z.enum(['mensch', 'regel']),
      approvedAmount: cents.optional(),
      note: z.string().optional(),
    })
    .optional(),
});

const caseRound = z.object({
  endedAt: time,
  quoteId: id.optional(),
  claim: claim.optional(),
  bookingIds: z.array(id),
  findingIds: z.array(id),
});

const caseRecord = z.object({
  id,
  householdId: id,
  deviceId: id,
  reportedBy: id,
  status: z.enum([
    'offen',
    'selbsthilfe',
    'eskaliert',
    'freigabe_noetig',
    'freigegeben',
    'abgelehnt',
    'in_reparatur',
    'erledigt',
    'abgebrochen',
  ]),
  entry: z.enum(['foto', 'meldung', 'symptom', 'freitext', 'pflege']),
  problemLabel: z.string(),
  diagnosisIds: z.array(id),
  guideRunIds: z.array(id),
  photoIds: z.array(id),
  quoteId: id.optional(),
  bookingId: id.optional(),
  claim: claim.optional(),
  resolution: z
    .enum([
      'selbst_geloest',
      'im_call_geloest',
      'repariert',
      'ersatzteil_eingebaut',
      'ersatzgeraet',
      'pflege_erledigt',
    ])
    .optional(),
  cancelReason: z.string().optional(),
  pausedAt: time.optional(),
  createdAt: time,
  updatedAt: time,
  closedAt: time.optional(),
  rounds: z.array(caseRound).optional(),
});

const caseEvent = z.object({
  id,
  caseId: id,
  type: z.enum([
    'fall_angelegt',
    'foto_aufgenommen',
    'ergebnis_erkannt',
    'rueckfrage_gestellt',
    'rueckfrage_beantwortet',
    'anleitung_gestartet',
    'schritt_erledigt',
    'schritt_zurueck',
    'schritt_geht_nicht',
    'sicherheit_bestaetigt',
    'anleitung_beendet',
    'weitergabe_bestaetigt',
    'einwilligung_widerrufen',
    'videocall_angefragt',
    'videocall_gestartet',
    'videocall_beendet',
    'befund_erstellt',
    'angebot_erstellt',
    'schaden_gemeldet',
    'freigabe_entschieden',
    'termin_angefragt',
    'preis_genannt',
    'zahlungspflichtig_gebucht',
    'nicht_gebucht',
    'termin_bestaetigt',
    'betrieb_unterwegs',
    'reparatur_abgeschlossen',
    'abschluss_bestaetigt',
    'problem_besteht_weiter',
    'bewertet',
    'pausiert',
    'fortgesetzt',
    'abgebrochen',
    'assistent_gefragt',
    'status_geaendert',
  ]),
  at: time,
  actor: z.object({
    kind: z.enum(['haushalt', 'fachkraft', 'betrieb', 'versicherer', 'system']),
    id: id.optional(),
    name: z.string().optional(),
  }),
  payload: z.record(z.string(), z.unknown()),
});

const photo = z.object({
  id,
  caseId: id.optional(),
  deviceId: id,
  takenAt: time,
  purpose: z.enum(['display', 'typenschild', 'bauteil', 'schritt', 'kaufbeleg', 'abschluss']),
  source: z.enum(['in_app_camera', 'betrieb', 'demo']),
  uri: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
  sha256: z.string().optional(),
});

const diagnosis = z.object({
  id,
  caseId: id,
  photoIds: z.array(id),
  mode: z.enum(['display', 'typenschild', 'bauteil', 'meldung', 'symptom']),
  errorPattern: z.string(),
  displayMessage: z.string().optional(),
  component: z.string().optional(),
  visibleDamage: z.string().optional(),
  confidence: z.enum(['hoch', 'mittel', 'unsicher']),
  confidenceScore: z.number(),
  source: z.enum(['fehlererkennung', 'nutzerangabe', 'fachkraft', 'betrieb']),
  guideId: z.string().optional(),
  createdAt: time,
  discardedAt: time.optional(),
});

const guideRun = z.object({
  id,
  caseId: id,
  guideId: z.string(),
  startedAt: time,
  currentStep: z.number(),
  completedSteps: z.array(z.number()),
  abortedAtStep: z.number().optional(),
  abortNote: z.string().optional(),
  outcome: z.enum(['laeuft_wieder', 'laeuft_nicht', 'geht_nicht', 'fertig']).optional(),
  endedAt: time.optional(),
});

const consent = z.object({
  id,
  personId: id,
  caseId: id.optional(),
  purpose: z.enum([
    'weitergabe_fachkraft',
    'weitergabe_versicherer',
    'weitergabe_betrieb',
    'screenshots_im_call',
    'hersteller_einzelfall',
    'mitteilungen',
    'chat_assistent',
  ]),
  legalBasis: z.enum(['vertrag', 'einwilligung']),
  recipient: partnerRef,
  dataCategories: z.array(z.string()),
  textVersion: z.string(),
  textHash: z.string().optional(),
  grantedAt: time,
  revokedAt: time.optional(),
});

const chatMessage = z.object({
  id,
  caseId: id,
  role: z.enum(['haushalt', 'assistent']),
  text: z.string(),
  at: time,
  suggestion: z.enum(['anleitung', 'hilfe']).optional(),
  guideId: z.string().optional(),
  forwarded: z.boolean().optional(),
});

const quote = z.object({
  id,
  caseId: id,
  createdBy: z.object({ kind: z.enum(['fachkraft', 'betrieb']), name: z.string() }),
  repair: z.object({
    partName: z.string().optional(),
    originalPart: z.boolean(),
    parts: cents,
    labor: cents,
    total: cents,
  }),
  replacement: z.object({ total: cents, note: z.string() }),
  saving: cents,
  payer: z.object({
    kind: z.enum(['versicherer', 'haushalt', 'haendler', 'hersteller']),
    name: z.string(),
  }),
  deductible: cents,
  isExample: z.boolean(),
  createdAt: time,
});

const booking = z.object({
  id,
  caseId: id,
  kind: z.enum(['reparatur', 'vor_ort_diagnose', 'ersatzteil_versand']),
  provider: partnerRef.extend({ authorized: z.boolean() }),
  slotLabel: z.string(),
  slotStart: time.optional(),
  status: z.enum(['angefragt', 'bestaetigt', 'unterwegs', 'erledigt', 'storniert']),
  subjectToApproval: z.boolean(),
  price: cents.optional(),
  binding: z.object({ at: time, amount: cents }).optional(),
  address: address.optional(),
  completionPhotoId: id.optional(),
  rating: z.object({ stars: z.literal([1, 2, 3, 4, 5]), at: time }).optional(),
  createdAt: time,
});

const videoSession = z.object({
  id,
  caseId: id,
  expert: z.object({ name: z.string(), provider: partnerRef }),
  requestedAt: time,
  startedAt: time.optional(),
  endedAt: time.optional(),
  outcome: z.enum(['verbunden', 'keine_fachkraft', 'abgebrochen']).optional(),
  recording: z.literal(false),
  screenshotsConsentId: id.optional(),
});

const demoSettings = z.object({
  hints: z.boolean(),
  scanScenario: z.enum(['erkannt', 'nicht_erkannt']),
  diagnosisScenario: z.enum(['standard', 'unsicher', 'unscharf']),
  videoScenario: z.enum(['verbunden', 'keine_fachkraft']),
  claimScenario: z.enum(['freigeben', 'ablehnen']),
  deductible: cents,
  dismissedHints: z.array(z.string()),
});

/** Der vollständige Stand, wie partialize ihn schreibt */
export const appDataSchema = z.object({
  onboardingDone: z.boolean(),
  appearance: z.enum(['system', 'hell', 'dunkel']),
  demo: demoSettings,
  notifications: z.enum(['offen', 'erlaubt', 'abgelehnt']),
  household: household.optional(),
  persons: z.array(person),
  contracts: z.array(contract),
  devices: z.array(device),
  cases: z.record(id, caseRecord),
  events: z.array(caseEvent),
  photos: z.array(photo),
  diagnoses: z.array(diagnosis),
  guideRuns: z.record(id, guideRun),
  consents: z.array(consent),
  quotes: z.array(quote),
  bookings: z.array(booking),
  videoSessions: z.array(videoSession),
  chatMessages: z.array(chatMessage),
  nextCaseNumber: z.number().int(),
});

/**
 * Was beim Laden ankommen darf: Felder und Einstellungen, die eine ältere App noch nicht kannte,
 * dürfen fehlen. merge ergänzt sie aus dem Anfangsstand. Was da ist, muss passen.
 */
export const storedStateSchema = appDataSchema
  .partial()
  .extend({ demo: demoSettings.partial().optional() });

export type StoredState = z.infer<typeof storedStateSchema>;

/** Prüft die Form und liefert nur die bekannten Felder. Wirft StoreLoadError bei Abweichung. */
export function parseStoredState(state: unknown): StoredState {
  const checked = storedStateSchema.safeParse(state);
  if (checked.success) return checked.data;
  const issue = checked.error.issues[0];
  const where = issue?.path.length ? issue.path.join('.') : 'state';
  throw new StoreLoadError('form', `Gespeicherter Stand hat eine falsche Form bei ${where}`, {
    cause: checked.error,
  });
}

// tsc prüft, dass Schema und AppData dieselben Felder mit denselben Typen haben, auch die
// optionalen. Ein Feld, das nur im Typ steht, ginge beim Laden sonst still verloren.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Pflicht<T> = T extends readonly (infer U)[]
  ? Pflicht<U>[]
  : T extends object
    ? { [K in keyof T]-?: Pflicht<T[K]> }
    : T;
type Assert<T extends true> = T;
type Schema = z.infer<typeof appDataSchema>;
export type SchemaPasstZuAppData = Assert<
  Same<Schema, AppData> extends true ? Same<Pflicht<Schema>, Pflicht<AppData>> : false
>;
