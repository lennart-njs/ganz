// Fallakte für den Händler bauen (Entscheidung 28). Nur nach deiner Bestätigung, nur dieser Fall,
// nur die Kategorien, die die Bestätigung nennt (model/policies/consentScopes.ts, weitergabe_haendler).
// Nicht dabei: das Gespräch mit dem Reparatur-Assistenten samt Notizen daraus, die Vertragsnummer,
// Fotos zu Fragen an ihn.
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';
import { appliance } from '@/lib/appliance';
import { eventLabel } from '@/lib/caseEvents';
import { caseStatusLabel, guideSummary, latestGuideRun } from '@/lib/caseView';
import { isAssistantNote } from '@/lib/chat/note';
import { getManufacturer } from '@/lib/devices';
import { findCatalogEntry } from '@/lib/guideCatalog';
import { selectCaseFacts } from '@/model/policies/caseFacts';
import { DATA_CATEGORIES, type DataCategory } from '@/model/policies/consentScopes';
import { isFinding } from '@/model/policies/rounds';
import { SHARE_FORMAT_VERSION, type SharedCaseFile, type SharedPhoto } from '@/model/sharing';
import type { CaseEvent, CaseEventType, Consent, Diagnosis, Id, Photo } from '@/model/types';
import type { AppData } from '@/store/appStore';

/** Die aktive Bestätigung „Fall an den Händler“ für diesen Fall */
export function dealerConsent(s: AppData, caseId: Id) {
  return s.consents.findLast(
    (k) => k.caseId === caseId && k.purpose === 'weitergabe_haendler' && !k.revokedAt,
  );
}

const actorName = (e: CaseEvent) =>
  e.actor.name ??
  {
    haushalt: de.sharing.actor.haushalt,
    fachkraft: de.sharing.actor.fachkraft,
    betrieb: de.sharing.actor.betrieb,
    versicherer: demoConfig.insurer.shortName,
    haendler: de.sharing.actor.haendler,
    system: de.app.name,
  }[e.actor.kind];

/**
 * Bezeichnungen, die Bestätigungen „Fall an den Händler“ bis Version 2026-11-3 statt Schlüsseln
 * speicherten, und die Kategorien, die sie meinten (docs/ANNAHMEN.md, Übertragung U5). Die
 * Seriennummer steht auf dem Typenschild. 2026-11-1 speicherte die ersten fünf, 2026-11-3 alle
 * sechs. Gespeicherte Werte, kein Text der App: nie ändern.
 */
export const LEGACY_DEALER_LABELS: Readonly<Record<string, readonly DataCategory[]>> = {
  'Name und Adresse': ['name', 'adresse'],
  'Gerät, Typenschild und Kaufdatum': ['geraet', 'typenschild', 'seriennummer', 'kaufdatum'],
  'Problem und Fotos aus dem Fall': ['problem', 'fotos'],
  'Ergebnis und Schritte der Anleitung': ['ergebnis', 'schritte'],
  'Befund, Kosten und Termin': ['befund', 'kosten', 'termin'],
  'Deine Nachrichten an den Händler': ['nachrichten_haendler'],
};

const isCategory = (x: string): x is DataCategory =>
  (DATA_CATEGORIES as readonly string[]).includes(x);

const legacyLabels = new Map(Object.entries(LEGACY_DEALER_LABELS));

/**
 * Die Kategorien, die eine Bestätigung erlaubt. Ältere Stände speichern Bezeichnungen, sie zählen
 * mit den Kategorien aus LEGACY_DEALER_LABELS. Was keins von beiden ist, erlaubt nichts.
 *
 * Eine Bestätigung aus Bezeichnungen erlaubt immer auch Nachrichten und Antworten an den Händler
 * (U5). Version 2026-11-1 nannte sie nicht, aber „meldet sich hier im Gespräch“: Jede Nachricht und
 * jede Antwort ist ein eigener Tap an den Händler, und die Akte schickte sie bis Schritt 3.1 mit.
 */
export function consentCategories(consent: Pick<Consent, 'dataCategories'>): Set<DataCategory> {
  const out = new Set<DataCategory>();
  for (const x of consent.dataCategories) {
    if (isCategory(x)) {
      out.add(x);
      continue;
    }
    const legacy = legacyLabels.get(x);
    if (!legacy) continue;
    for (const k of legacy) out.add(k);
    out.add('nachrichten_haendler');
  }
  return out;
}

/**
 * Ereignisse, die im Verlauf der Akte stehen dürfen (Allow-List): die Arten von 67d2fd8 ohne
 * assistent_gefragt (Gespräch mit dem Assistenten) und nachricht_an_haendler (steht in
 * `messages`). Eine neue Art geht erst an den Händler, wenn sie hier steht. preis_genannt,
 * zahlungspflichtig_gebucht, nicht_gebucht, termin_abgesagt und nachbesserung_verlangt (ganz Nr. 31
 * bis 34) kommen mit Schritt 5.2 der Übertragung oder bleiben draußen.
 */
export const TIMELINE_EVENTS: readonly CaseEventType[] = [
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
  'termin_bestaetigt',
  'betrieb_unterwegs',
  'reparatur_abgeschlossen',
  'abschluss_bestaetigt',
  'problem_besteht_weiter',
  'bewertet',
  'pausiert',
  'fortgesetzt',
  'abgebrochen',
  'status_geaendert',
  'haendler_angenommen',
  'haendler_rueckfrage',
  'haendler_entscheidung',
  'haendler_betrieb',
  'haendler_status',
  'haendler_nachricht',
  'haendler_termin',
  'haendler_ersatzteil',
];

/**
 * Darf das Ereignis in die Akte, als Zeile im Verlauf oder als Antwort? Nur Arten aus der
 * Allow-List. Fotos zu Fragen nicht (Übertragung 1.1): Ein Foto für den Assistenten geht den
 * Händler nichts an, ein Foto für den Händler steht bei seiner Nachricht. Eine Notiz an die
 * Fachkraft aus dem Gespräch mit dem Assistenten auch nicht: Sie ist eine Nachricht an den
 * Assistenten, auf die keine Antwort kam.
 */
const inTimeline = (e: CaseEvent) =>
  TIMELINE_EVENTS.includes(e.type) &&
  !isAssistantNote(e) &&
  !(e.type === 'foto_aufgenommen' && e.payload.purpose === 'frage');

/** Verkleinert ein Foto für die Akte. Beispielfotos ohne Bild bleiben ohne Bild. */
export async function photoForShare(photo: Photo): Promise<SharedPhoto> {
  const base: SharedPhoto = {
    id: photo.id,
    takenAt: photo.takenAt,
    purpose: photo.purpose,
    source: photo.source,
  };
  if (!photo.uri) return base;
  try {
    const ctx = ImageManipulator.manipulate(photo.uri);
    ctx.resize((photo.width ?? 0) >= (photo.height ?? 0) ? { width: 800 } : { height: 800 });
    const img = await ctx.renderAsync();
    const out = await img.saveAsync({ base64: true, compress: 0.6, format: SaveFormat.JPEG });
    return out.base64 ? { ...base, jpegBase64: out.base64 } : base;
  } catch {
    return base;
  }
}

/**
 * Baut die Akte aus dem gespeicherten Fall. Fotos kommen fertig verkleinert dazu. Ein Feld bekommt
 * nur einen Wert, wenn seine Kategorie in der Bestätigung steht. Ohne Kategorie bleiben Pflichtfelder
 * leer. Fallnummer, Empfänger, Stand und Zeitpunkte des Falls und die Geräteart gehören zur
 * Weitergabe selbst: Sie bleiben auch nach dem Widerruf im Backend (server/backend/fileStore.ts).
 */
export function buildSharedCaseFile(
  s: AppData,
  caseId: Id,
  photos: SharedPhoto[],
  now: string,
): SharedCaseFile | undefined {
  const c = s.cases[caseId];
  const consent = dealerConsent(s, caseId);
  const device = s.devices.find((d) => d.id === c?.deviceId);
  const facts = selectCaseFacts(s, caseId);
  if (!c || !consent || !device || !facts) return undefined;
  const allowed = consentCategories(consent);
  const has = (k: DataCategory) => allowed.has(k);
  const all = s.events.filter((e) => e.caseId === caseId);
  const rated = s.bookings.findLast((b) => b.caseId === caseId && b.rating)?.rating;
  const person = s.persons[0];
  const contract = s.contracts.find((k) => k.id === device.contractId);
  const events = all.filter(inTimeline);
  const summary = guideSummary(s, c);
  const run = latestGuideRun(s, c);
  // Befund, Kostenvoranschlag und Termin der laufenden Runde, wie die App sie zeigt
  const { finding, quote, booking } = facts;
  return {
    version: SHARE_FORMAT_VERSION,
    caseId,
    recipient: consent.recipient,
    consentId: consent.id,
    sharedAt: consent.grantedAt,
    updatedAt: now,
    isExample: demoConfig.isExample,
    customer: {
      name: has('name') ? (person?.displayName ?? '') : '',
      address: has('adresse') ? s.household?.address : undefined,
    },
    device: {
      manufacturer: has('geraet') ? getManufacturer(device.manufacturerId).name : '',
      model: has('geraet') ? device.model : '',
      category: device.category,
      categoryLabel: has('geraet') ? de.deviceCategory[device.category] : '',
      materialNumber: has('typenschild') ? device.materialNumber : undefined,
      serialNumber: has('seriennummer') ? device.serialNumber : undefined,
      purchaseDate: has('kaufdatum') ? device.purchaseDate : undefined,
      soldBy: has('kaufdatum') ? device.soldBy : undefined,
    },
    protection:
      contract && has('versicherung')
        ? {
            provider: contract.provider.name,
            product: contract.productName,
            validUntil: contract.validUntil,
          }
        : undefined,
    case: {
      status: c.status,
      statusLabel: caseStatusLabel(c.status),
      entry: c.entry,
      problemLabel: has('problem') ? c.problemLabel : '',
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      closedAt: c.closedAt,
      resolution: c.resolution,
    },
    // Ein verworfenes Ergebnis („Passt nicht“) geht nicht mit, wie an Assistent und Fachkraft. Der
    // Befund von Fachkraft oder Betrieb steht auch hier, darum nur mit seiner Kategorie.
    results: (has('ergebnis') ? c.diagnosisIds : [])
      .map((id) => s.diagnoses.find((d) => d.id === id))
      .filter((d): d is Diagnosis => !!d && !d.discardedAt && (!isFinding(d) || has('befund')))
      .map((d) => ({
        component: d.component,
        displayMessage: d.displayMessage,
        confidence: d.confidence,
        source: d.source,
        at: d.createdAt,
      })),
    guide:
      summary && has('schritte')
        ? {
            title: summary.title,
            source: findCatalogEntry(device)?.document.title ?? '',
            total: summary.total,
            completed: summary.completedTitles,
            abortedAt: summary.aborted
              ? { step: summary.aborted.step, title: summary.aborted.title }
              : undefined,
            note: has('notiz') ? summary.aborted?.note : undefined,
            outcome: run?.outcome,
          }
        : undefined,
    finding:
      finding && has('befund')
        ? {
            label:
              finding.errorPattern === 'ersatzgeraet_noetig'
                ? de.finding.options.ersatzgeraet
                : appliance(device.category).finding.title,
            by:
              finding.source === 'fachkraft'
                ? de.sharing.actor.fachkraft
                : de.sharing.actor.betrieb,
            at: finding.createdAt,
          }
        : undefined,
    quote:
      quote && has('kosten')
        ? {
            repair: quote.repair,
            replacement: quote.replacement,
            saving: quote.saving,
            payer: quote.payer,
            deductible: quote.deductible,
            isExample: quote.isExample,
          }
        : undefined,
    booking:
      booking && has('termin')
        ? {
            provider: booking.provider.name,
            slotLabel: booking.slotLabel,
            status: de.sharing.booking[booking.status],
          }
        : undefined,
    photos: has('fotos') ? photos : [],
    // Der Verlauf nennt die Ereignisse mit ihren Zeilen wie in der App
    timeline: (has('verlauf') ? events : []).map((e) => ({
      at: e.at,
      type: e.type,
      label: eventLabel(e),
      actor: actorName(e),
    })),
    answers: (has('nachrichten_haendler') ? events : [])
      .filter((e) => e.type === 'rueckfrage_beantwortet' && e.payload.questionEventId)
      .map((e) => ({
        questionEventId: String(e.payload.questionEventId),
        answer: String(e.payload.answer),
        at: e.at,
      })),
    messages: (has('nachrichten_haendler') ? all : [])
      .filter((e) => e.type === 'nachricht_an_haendler')
      .map((e) => ({
        id: e.id,
        at: e.at,
        text: String(e.payload.text ?? ''),
        ...(e.payload.photoId && has('fotos') ? { photoId: String(e.payload.photoId) } : {}),
      })),
    ...(rated && has('bewertung') ? { rating: rated.stars } : {}),
  };
}

/**
 * Fotos, die in die Akte gehören: alle aus dem Fall außer Fotos zu Fragen an den Assistenten.
 * Fotos zu Nachrichten an den Händler gehören dazu.
 */
export function photosToShare(s: AppData, caseId: Id): Photo[] {
  const toDealer = new Set(
    s.events
      .filter((e) => e.caseId === caseId && e.type === 'nachricht_an_haendler' && e.payload.photoId)
      .map((e) => String(e.payload.photoId)),
  );
  return s.photos
    .filter((p) => p.caseId === caseId && (p.purpose !== 'frage' || toDealer.has(p.id)))
    .slice(-12);
}
