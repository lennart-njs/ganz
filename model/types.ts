// ganz – gemeinsames Datenmodell (App, später Backend und Dashboards)
// Quelle: docs/BUILD_PLAN.md Abschnitt 3. Feldbeschreibungen für Dashboards: docs/DATA_MODEL.md (Schritt 14).
// Zeitangaben: ISO 8601 mit Zeitzone. Beträge: Cent (ganzzahlig).

export type Id = string;
export type ISODateTime = string;
export type Cents = number;

// ---------- Haushalt, Personen, Vertrag ----------

export interface Address {
  street: string;
  zip: string;
  city: string;
}

export interface Person {
  id: Id;
  displayName: string;
  email?: string;
  /** Im Prototyp ist die Nutzerin immer Versicherungsnehmerin (Frage 2). */
  role: 'versicherungsnehmer' | 'mitglied';
}

export interface Household {
  id: Id;
  members: Person[];
  address?: Address;
  createdAt: ISODateTime;
}

export type PartnerKind = 'versicherer' | 'haendler' | 'hersteller' | 'betrieb';

export interface PartnerRef {
  id: Id;
  kind: PartnerKind;
  name: string;
}

export interface Contract {
  id: Id;
  householdId: Id;
  kind: 'garantieverlaengerung' | 'geraeteversicherung' | 'herstellergarantie';
  provider: PartnerRef; // Kostenträger, z. B. Versicherer
  soldBy?: PartnerRef; // Händler, über den der Schutz verkauft wurde
  productName: string; // „Garantieverlängerung“
  contractNumber: string;
  policyholderId: Id; // Person
  validFrom: ISODateTime;
  validUntil: ISODateTime;
  deductible: Cents; // Selbstbeteiligung
  coveredDeviceIds: Id[];
  linkedVia: 'vertragsnummer' | 'haendler_code';
  linkedAt: ISODateTime;
}

// ---------- Gerät ----------

export type DeviceCategory = 'waschmaschine' | 'geschirrspueler' | 'trockner' | 'kuehlschrank';

export interface Manufacturer {
  id: Id;
  name: string;
  serviceContact?: { label: string; phone: string; freeOfCharge: boolean };
}

export interface Device {
  id: Id;
  householdId: Id;
  manufacturerId: Id;
  category: DeviceCategory;
  model: string; // „WKB 130“
  materialNumber?: string; // vom Typenschild
  serialNumber?: string; // Fabrik-Nr. vom Typenschild
  purchaseDate?: ISODateTime;
  purchaseProofPhotoId?: Id;
  contractId?: Id;
  identifiedBy: 'typenschild_scan' | 'manuell' | 'vertrag';
  createdAt: ISODateTime;
}

// ---------- Fall und Status-Maschine ----------

export type CaseStatus =
  | 'offen'
  | 'selbsthilfe'
  | 'eskaliert'
  | 'freigabe_noetig'
  | 'freigegeben'
  | 'abgelehnt' // Ergänzung zum Auftrag: Ausgang der Prüfung sichtbar machen
  | 'in_reparatur'
  | 'erledigt'
  | 'abgebrochen';

export type CaseEntry = 'foto' | 'meldung' | 'symptom' | 'freitext' | 'pflege';

export type CaseResolution =
  | 'selbst_geloest'
  | 'im_call_geloest'
  | 'repariert'
  | 'ersatzteil_eingebaut'
  | 'ersatzgeraet'
  | 'pflege_erledigt';

export interface Claim {
  contractId: Id;
  reportedAt: ISODateTime;
  reportedBy: Id; // Person – nur durch aktive Bestätigung
  confirmationId: Id; // Consent mit purpose 'weitergabe_versicherer'
  decision?: {
    result: 'freigegeben' | 'abgelehnt' | 'rueckfrage';
    at: ISODateTime;
    actor: 'mensch' | 'regel'; // Art. 22 DSGVO
    approvedAmount?: Cents;
    note?: string;
  };
}

export interface Case {
  id: Id; // sichtbar, z. B. „GS-24817“
  householdId: Id;
  deviceId: Id;
  reportedBy: Id;
  status: CaseStatus;
  entry: CaseEntry;
  problemLabel: string; // „Wasserablauf“
  diagnosisIds: Id[];
  guideRunIds: Id[];
  photoIds: Id[];
  quoteId?: Id;
  bookingId?: Id;
  claim?: Claim;
  resolution?: CaseResolution;
  cancelReason?: string;
  pausedAt?: ISODateTime; // „später weitermachen“, kein eigener Status
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  closedAt?: ISODateTime;
}

// ---------- Ereignisse ----------

export type CaseEventType =
  | 'fall_angelegt'
  | 'foto_aufgenommen'
  | 'ergebnis_erkannt'
  | 'rueckfrage_beantwortet'
  | 'anleitung_gestartet'
  | 'schritt_erledigt'
  | 'schritt_zurueck'
  | 'schritt_geht_nicht'
  | 'sicherheit_bestaetigt'
  | 'anleitung_beendet'
  | 'weitergabe_bestaetigt'
  | 'einwilligung_widerrufen'
  | 'videocall_angefragt'
  | 'videocall_gestartet'
  | 'videocall_beendet'
  | 'befund_erstellt'
  | 'angebot_erstellt'
  | 'schaden_gemeldet'
  | 'freigabe_entschieden'
  | 'termin_angefragt'
  | 'termin_bestaetigt'
  | 'betrieb_unterwegs'
  | 'reparatur_abgeschlossen'
  | 'abschluss_bestaetigt'
  | 'problem_besteht_weiter'
  | 'bewertet'
  | 'pausiert'
  | 'fortgesetzt'
  | 'abgebrochen'
  | 'status_geaendert';

export type ActorKind = 'haushalt' | 'fachkraft' | 'betrieb' | 'versicherer' | 'system';

export interface CaseEvent {
  id: Id;
  caseId: Id;
  type: CaseEventType;
  at: ISODateTime;
  actor: { kind: ActorKind; id?: Id; name?: string };
  /** Typisiert pro Ereignis im Code (EventPayloads), hier offen gehalten. */
  payload: Record<string, unknown>;
}

// ---------- Foto und Ergebnis ----------

export type PhotoPurpose =
  'display' | 'typenschild' | 'bauteil' | 'schritt' | 'kaufbeleg' | 'abschluss';

export interface Photo {
  id: Id;
  caseId?: Id;
  deviceId: Id;
  takenAt: ISODateTime;
  purpose: PhotoPurpose;
  source: 'in_app_camera' | 'betrieb' | 'demo'; // kein Galerie-Import
  uri: string;
  width?: number;
  height?: number;
  sha256?: string; // später: Integritätsnachweis
}

export type Confidence = 'hoch' | 'mittel' | 'unsicher';

export interface Diagnosis {
  id: Id;
  caseId: Id;
  photoIds: Id[];
  mode: 'display' | 'typenschild' | 'bauteil' | 'meldung' | 'symptom';
  errorPattern: string; // Fehlerbild, z. B. 'wasserablauf'
  displayMessage?: string; // gelesene Meldung
  component?: string; // „Laugenfilter“
  visibleDamage?: string;
  confidence: Confidence;
  confidenceScore: number; // 0..1, nur intern und für Dashboards
  source: 'fehlererkennung' | 'nutzerangabe' | 'fachkraft' | 'betrieb';
  guideId?: string;
  createdAt: ISODateTime;
}

// ---------- Anleitung ----------

export interface GuideStep {
  t: string; // Titel – wörtlich aus guides()
  d: string; // Text – wörtlich
  tool?: string;
  w?: string; // Warnhinweis – wörtlich
  img?: string; // Schlüssel des Fotos
}

export interface Guide {
  id: string; // 'ablauf', 'zulauf', …
  kind: 'stoerung' | 'pflege' | 'hinweis';
  title: string;
  code: string;
  noSelf?: boolean;
  sourceDocument: string; // „Gebrauchsanweisung WKB 130, M.-Nr. 10 162 440“
  steps: GuideStep[];
}

export interface GuideRun {
  id: Id;
  caseId: Id;
  guideId: string;
  startedAt: ISODateTime;
  currentStep: number;
  completedSteps: number[];
  abortedAtStep?: number; // „Geht nicht“
  abortNote?: string;
  outcome?: 'laeuft_wieder' | 'laeuft_nicht' | 'geht_nicht' | 'fertig';
  endedAt?: ISODateTime;
}

// ---------- Einwilligung und Bestätigung ----------

export type ConsentPurpose =
  | 'weitergabe_fachkraft'
  | 'weitergabe_versicherer'
  | 'weitergabe_betrieb'
  | 'screenshots_im_call'
  | 'hersteller_einzelfall'
  | 'mitteilungen';

export interface Consent {
  id: Id;
  personId: Id;
  caseId?: Id;
  purpose: ConsentPurpose;
  /** 'vertrag' = Bestätigung einer angefragten Leistung (lit. b), 'einwilligung' = lit. a */
  legalBasis: 'vertrag' | 'einwilligung';
  recipient: PartnerRef;
  dataCategories: string[]; // „Modell“, „Fotos“, „Protokoll“
  textVersion: string; // Version des gezeigten Hinweistexts
  grantedAt: ISODateTime;
  revokedAt?: ISODateTime;
}

// ---------- Kosten und Buchung ----------

export type Payer = { kind: 'versicherer' | 'haushalt' | 'haendler' | 'hersteller'; name: string };

export interface Quote {
  id: Id;
  caseId: Id;
  createdBy: { kind: 'fachkraft' | 'betrieb'; name: string };
  repair: { partName?: string; originalPart: boolean; parts: Cents; labor: Cents; total: Cents };
  replacement: { total: Cents; note: string };
  saving: Cents; // berechnet: replacement.total − repair.total
  payer: Payer;
  deductible: Cents;
  isExample: boolean; // Beispielwert aus der Demo-Konfiguration
  createdAt: ISODateTime;
}

export type BookingStatus = 'angefragt' | 'bestaetigt' | 'unterwegs' | 'erledigt' | 'storniert';

export interface Booking {
  id: Id;
  caseId: Id;
  kind: 'reparatur' | 'vor_ort_diagnose' | 'ersatzteil_versand';
  provider: PartnerRef & { authorized: boolean };
  slotLabel: string; // „Mo vormittags“
  slotStart?: ISODateTime;
  status: BookingStatus;
  subjectToApproval: boolean; // „vorbehaltlich Freigabe“
  address?: Address;
  completionPhotoId?: Id;
  rating?: { stars: 1 | 2 | 3 | 4 | 5; at: ISODateTime };
  createdAt: ISODateTime;
}

export interface VideoSession {
  id: Id;
  caseId: Id;
  expert: { name: string; provider: PartnerRef };
  requestedAt: ISODateTime;
  startedAt?: ISODateTime;
  endedAt?: ISODateTime;
  outcome?: 'verbunden' | 'keine_fachkraft' | 'abgebrochen';
  recording: false; // nie Tonaufnahme
  screenshotsConsentId?: Id;
}
