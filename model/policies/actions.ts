// Was der Haushalt in einem Fall jetzt tun kann. Eine Regelquelle für alle Screens:
// TRANSITIONS aus der Status-Maschine, dazu Regeln zu Bestätigung, Termin und Freigabe.
// Kein Import aus react, expo, i18n, config oder store (ZUKUNFTSPLAN 3.1).
import { canTransition, type CaseCommand } from '../caseMachine';
import { booked } from './bookingRules';
import type { CaseFacts } from './caseFacts';

export type ActionKey =
  // Selbsthilfe
  | 'problem_aendern'
  | 'anleitung_starten'
  | 'anleitung_fortsetzen'
  | 'hilfe_holen'
  // Hilfe durch Menschen
  | 'videocall_anfragen'
  | 'rueckruf_anfragen'
  | 'termin_diagnose'
  // Gekauft beim Händler: den Fall an ihn senden, dann mit ihm schreiben (Entscheidungen 28, 32)
  | 'an_haendler_senden'
  | 'haendler_schreiben'
  // Kosten
  | 'schaden_melden'
  | 'selbst_zahlen'
  | 'selbst_zahlen_nach_ablehnung'
  | 'termin_versicherer'
  | 'termin_selbst'
  // Verbindlich buchen, sobald feststeht, was du zahlst (Nr. 31, Nr. 33), oder nicht buchen
  | 'zahlungspflichtig_buchen'
  | 'nicht_buchen'
  // Nachbesserung in der Gewährleistung, ohne Kosten (Nr. 32)
  | 'nachbesserung_anfragen'
  // Reparatur
  | 'reparatur_bestaetigen'
  | 'problem_besteht_weiter'
  | 'bewerten'
  // Bestätigungen
  | 'weitergabe_erneuern'
  // Der Fall selbst
  | 'pausieren'
  | 'abbrechen';

/** Reihenfolge wie im Ablauf eines Falls */
export const ALL_ACTIONS: readonly ActionKey[] = [
  'problem_aendern',
  'anleitung_starten',
  'anleitung_fortsetzen',
  'hilfe_holen',
  'videocall_anfragen',
  'rueckruf_anfragen',
  'termin_diagnose',
  'an_haendler_senden',
  'haendler_schreiben',
  'schaden_melden',
  'selbst_zahlen',
  'selbst_zahlen_nach_ablehnung',
  'termin_versicherer',
  'termin_selbst',
  'zahlungspflichtig_buchen',
  'nicht_buchen',
  'nachbesserung_anfragen',
  'reparatur_bestaetigen',
  'problem_besteht_weiter',
  'bewerten',
  'weitergabe_erneuern',
  'pausieren',
  'abbrechen',
];

type Rule = (f: CaseFacts) => boolean;

// Termin-Regel: höchstens ein Termin je Art, der zählt (booked, model/policies/bookingRules.ts)
const repairDone = (f: CaseFacts) => f.bookings.reparatur?.status === 'erledigt';
/** Hilfe ist angefragt: eskaliert, oder die Anleitung ging nicht */
const helpPhase = (f: CaseFacts) =>
  f.status === 'eskaliert' ||
  (f.status === 'selbsthilfe' &&
    (f.guideOutcome === 'geht_nicht' || f.guideOutcome === 'laeuft_nicht'));
/**
 * Hilfe ist nötig, so wie mach’s es für das Angebot „Fall an … senden“ zählt (Entscheidung 28):
 * nach „Hilfe holen“, während der Versicherer prüft, nach seiner Ablehnung, mit Kostenvoranschlag
 * oder wenn die neueste Anleitung nicht ging. Der Ausgang der Anleitung zählt auch nach „Hilfe
 * holen“ und in einer späteren Runde, wie vor der Übertragung.
 */
const dealerHelpNeeded = (f: CaseFacts) =>
  f.status === 'eskaliert' ||
  f.status === 'freigabe_noetig' ||
  f.status === 'abgelehnt' ||
  !!f.quote ||
  f.guideOutcome === 'geht_nicht' ||
  f.guideOutcome === 'laeuft_nicht';

const RULES: Record<ActionKey, Rule> = {
  // Antwort oder Problem ändern, solange der Fall am Anfang steht (wie updateCase im Store)
  problem_aendern: (f) => f.status === 'offen' || f.status === 'selbsthilfe',
  // Aus „offen“ wechselt der Fall in die Selbsthilfe, dort kommt eine weitere Anleitung dazu
  anleitung_starten: (f) =>
    canTransition(f.status, 'anleitung_starten') || f.status === 'selbsthilfe',
  anleitung_fortsetzen: (f) => !!f.guideRun && canTransition(f.status, 'selbst_geloest'),
  hilfe_holen: (f) => canTransition(f.status, 'hilfe_holen'),

  // Die Bestätigung an die Fachkraft entsteht mit dem Tap auf „Videocall starten“
  videocall_anfragen: helpPhase,
  // Bestätigung: Der Rückruf braucht eine gültige Weitergabe an die Fachkraft (R-16)
  rueckruf_anfragen: (f) =>
    f.status === 'eskaliert' && f.activeConsents.includes('weitergabe_fachkraft'),
  // Erst nach „Hilfe holen“: Nur dann bestätigt der Betrieb die Vor-Ort-Diagnose
  termin_diagnose: (f) =>
    f.status === 'eskaliert' &&
    !f.quote &&
    !booked(f, 'vor_ort_diagnose') &&
    !booked(f, 'reparatur'),

  // Gekauft beim Händler: Den Fall kannst du ihm senden, sobald Hilfe nötig ist, einmal je Fall
  // (Entscheidung 28). Auch nicht, solange ein Widerruf noch unterwegs ist, und nicht nach dem
  // Widerruf: Das Backend nimmt denselben Fall ohne das Token der ersten Weitergabe nicht an.
  an_haendler_senden: (f) =>
    !!f.soldBy && !f.dealerShared && !f.dealerSent && !f.closed && dealerHelpNeeded(f),
  // Antworten und Nachrichten an den Händler, auch die Buttons zu seiner Rückfrage und seinem
  // Terminvorschlag: nur, solange der Fall bei ihm ist und offen (Entscheidung 32)
  haendler_schreiben: (f) => f.dealerShared && !f.closed,

  // Freigabe: einmal melden, nur mit Schutz und Kostenvoranschlag (R-02)
  schaden_melden: (f) =>
    canTransition(f.status, 'schaden_melden') && f.hasContract && !!f.quote && f.claim === 'keiner',
  selbst_zahlen: (f) =>
    canTransition(f.status, 'selbst_zahlen') &&
    f.claim === 'keiner' &&
    !!f.quote &&
    !booked(f, 'reparatur'),
  // Nach der Ablehnung entscheidest du neu
  selbst_zahlen_nach_ablehnung: (f) =>
    canTransition(f.status, 'selbst_zahlen') &&
    f.claim === 'abgelehnt' &&
    !!f.quote &&
    !booked(f, 'reparatur'),
  // Termin auf Kosten des Versicherers: während der Prüfung (vorbehaltlich) oder nach der
  // Freigabe. Nach der Ablehnung nicht mehr (R-09), für ein Ersatzgerät nie.
  termin_versicherer: (f) =>
    ((f.status === 'freigabe_noetig' && f.claim === 'in_pruefung') ||
      (f.status === 'freigegeben' && f.claim === 'freigegeben')) &&
    !f.replacement &&
    !booked(f, 'reparatur'),
  // Termin, den der Haushalt zahlt. Der Preis steht vor dem Buchen (R-07).
  termin_selbst: (f) => RULES.selbst_zahlen(f) || RULES.selbst_zahlen_nach_ablehnung(f),
  // Der zweite Schritt nach der unverbindlichen Anfrage (Nr. 31): erst wenn feststeht, was du
  // zahlst (bindingDue in caseFacts.ts), nie während der Prüfung. Nur mit gültiger Weitergabe an
  // den Betrieb. Fehlt sie, bestätigst du sie erst erneut (R-12).
  zahlungspflichtig_buchen: (f) => !!f.bindingDue && !f.hold && !f.closed,
  // Du buchst nicht: Die unverbindliche Anfrage endet ohne Kosten, und der Fall bietet wieder, was
  // er vorher bot (Nr. 33, nach der Freigabe genauso). Dafür braucht es keine Weitergabe.
  nicht_buchen: (f) => !!f.bindingDue && !f.closed,
  // Nachbesserung in der Gewährleistung (Nr. 32): ein Termin beim Betrieb der Reparatur, ohne
  // Schadenfall und ohne Betrag. Nur mit gültiger Weitergabe an ihn. Fehlt sie, bestätigst du sie
  // erst erneut (R-12). Höchstens ein Reparaturtermin je Runde (R-08).
  nachbesserung_anfragen: (f) =>
    f.status === 'nachbesserung' && !!f.rework && !f.hold && !booked(f, 'reparatur'),

  reparatur_bestaetigen: (f) => canTransition(f.status, 'repariert') && repairDone(f),
  // Ein erledigter Fall öffnet sich nur wieder, wenn für das Gerät kein anderer offen ist (Nr. 13).
  // In der Gewährleistung wird daraus die Nachbesserung, sonst eine neue Runde (Nr. 32,
  // checkWarranty in warranty.ts). Der Store wählt den Befehl.
  problem_besteht_weiter: (f) =>
    canTransition(f.status, 'problem_besteht_weiter') &&
    !(f.closed && f.otherOpenCase) &&
    (f.status === 'erledigt' || repairDone(f)),
  bewerten: (f) => repairDone(f) && f.status !== 'abgebrochen',

  // Nach einem Widerruf hält der Fall an (R-12). Mit einem Tap geht es weiter, auch in der
  // Reparatur. Abbrechen geht dort seit Nr. 34 auch, siehe abbrechen.
  weitergabe_erneuern: (f) => !!f.hold,

  pausieren: (f) => !f.closed,
  // Nur wo die Status-Maschine es erlaubt: seit Nr. 34 auch in der Reparatur, nie in einem
  // geschlossenen Fall (R-01). Der Betrieb bekommt die Absage, auch ohne gültige Weitergabe.
  // Nur, solange die Reparatur läuft: Ist der Betrieb fertig, gibt es nichts mehr abzusagen. Dann
  // sagst du „Läuft wieder“ oder „Problem besteht weiter“, und die Gewährleistung bleibt (Nr. 32).
  abbrechen: (f) => canTransition(f.status, 'abbrechen') && !repairDone(f),
};

/** Darf der Haushalt das jetzt? Ohne Fakten (kein Fall): nein. */
export function can(facts: CaseFacts | undefined, key: ActionKey): boolean {
  return !!facts && RULES[key](facts);
}

/** Alles, was der Haushalt jetzt tun kann, in der Reihenfolge von ALL_ACTIONS */
export function availableActions(facts: CaseFacts | undefined): ActionKey[] {
  return ALL_ACTIONS.filter((key) => can(facts, key));
}

/** Befehl der Status-Maschine, den eine Aktion auslöst. Die Aktion gibt es nur, wo er erlaubt ist. */
export const ACTION_COMMANDS: Partial<Record<ActionKey, CaseCommand>> = {
  hilfe_holen: 'hilfe_holen',
  schaden_melden: 'schaden_melden',
  selbst_zahlen: 'selbst_zahlen',
  selbst_zahlen_nach_ablehnung: 'selbst_zahlen',
  reparatur_bestaetigen: 'repariert',
  problem_besteht_weiter: 'problem_besteht_weiter',
  abbrechen: 'abbrechen',
};
