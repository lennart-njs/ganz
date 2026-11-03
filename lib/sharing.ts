// Fallakte für den Händler bauen (Entscheidung 28). Nur nach deiner Bestätigung, nur dieser Fall.
// Nicht dabei: das Gespräch mit dem Reparatur-Assistenten, die Vertragsnummer, Fotos zu Fragen an ihn.
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';
import { appliance } from '@/lib/appliance';
import { eventLabel } from '@/lib/caseEvents';
import { caseStatusLabel, guideSummary, latestGuideRun } from '@/lib/caseView';
import { getManufacturer } from '@/lib/devices';
import { findCatalogEntry } from '@/lib/guideCatalog';
import { SHARE_FORMAT_VERSION, type SharedCaseFile, type SharedPhoto } from '@/model/sharing';
import type { CaseEvent, Id, Photo } from '@/model/types';
import { activeBooking, type AppData } from '@/store/appStore';

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

/** Ereignisse, die nicht in den Zeitstrahl der Akte gehören. Nachrichten stehen eigens in `messages`. */
const hidden: CaseEvent['type'][] = ['assistent_gefragt', 'nachricht_an_haendler'];

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

/** Baut die Akte aus dem gespeicherten Fall. Fotos kommen fertig verkleinert dazu. */
export function buildSharedCaseFile(
  s: AppData,
  caseId: Id,
  photos: SharedPhoto[],
  now: string,
): SharedCaseFile | undefined {
  const c = s.cases[caseId];
  const consent = dealerConsent(s, caseId);
  const device = s.devices.find((d) => d.id === c?.deviceId);
  if (!c || !consent || !device) return undefined;
  const all = s.events.filter((e) => e.caseId === caseId);
  const rated = s.bookings.findLast((b) => b.caseId === caseId && b.rating)?.rating;
  const person = s.persons[0];
  const contract = s.contracts.find((k) => k.id === device.contractId);
  const events = s.events.filter((e) => e.caseId === caseId && !hidden.includes(e.type));
  const summary = guideSummary(s, c);
  const run = latestGuideRun(s, c);
  const finding = [...s.diagnoses]
    .reverse()
    .find((d) => d.caseId === caseId && (d.source === 'fachkraft' || d.source === 'betrieb'));
  const quote = s.quotes.find((q) => q.id === c.quoteId);
  const booking = activeBooking(s, caseId);
  return {
    version: SHARE_FORMAT_VERSION,
    caseId,
    recipient: consent.recipient,
    consentId: consent.id,
    sharedAt: consent.grantedAt,
    updatedAt: now,
    isExample: demoConfig.isExample,
    customer: { name: person?.displayName ?? '', address: s.household?.address },
    device: {
      manufacturer: getManufacturer(device.manufacturerId).name,
      model: device.model,
      category: device.category,
      categoryLabel: de.deviceCategory[device.category],
      materialNumber: device.materialNumber,
      serialNumber: device.serialNumber,
      purchaseDate: device.purchaseDate,
      soldBy: device.soldBy,
    },
    protection: contract
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
      problemLabel: c.problemLabel,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      closedAt: c.closedAt,
      resolution: c.resolution,
    },
    results: c.diagnosisIds
      .map((id) => s.diagnoses.find((d) => d.id === id))
      .filter((d) => !!d)
      .map((d) => ({
        component: d.component,
        displayMessage: d.displayMessage,
        confidence: d.confidence,
        source: d.source,
        at: d.createdAt,
      })),
    guide: summary
      ? {
          title: summary.title,
          source: findCatalogEntry(device)?.document.title ?? '',
          total: summary.total,
          completed: summary.completedTitles,
          abortedAt: summary.aborted
            ? { step: summary.aborted.step, title: summary.aborted.title }
            : undefined,
          note: summary.aborted?.note,
          outcome: run?.outcome,
        }
      : undefined,
    finding: finding
      ? {
          label:
            finding.errorPattern === 'ersatzgeraet_noetig'
              ? de.finding.options.ersatzgeraet
              : appliance(device.category).finding.title,
          by:
            finding.source === 'fachkraft' ? de.sharing.actor.fachkraft : de.sharing.actor.betrieb,
          at: finding.createdAt,
        }
      : undefined,
    quote: quote
      ? {
          repair: quote.repair,
          replacement: quote.replacement,
          saving: quote.saving,
          payer: quote.payer,
          deductible: quote.deductible,
          isExample: quote.isExample,
        }
      : undefined,
    booking: booking
      ? {
          provider: booking.provider.name,
          slotLabel: booking.slotLabel,
          status: de.sharing.booking[booking.status],
        }
      : undefined,
    photos,
    timeline: events.map((e) => ({
      at: e.at,
      type: e.type,
      label: eventLabel(e),
      actor: actorName(e),
    })),
    answers: events
      .filter((e) => e.type === 'rueckfrage_beantwortet' && e.payload.questionEventId)
      .map((e) => ({
        questionEventId: String(e.payload.questionEventId),
        answer: String(e.payload.answer),
        at: e.at,
      })),
    messages: all
      .filter((e) => e.type === 'nachricht_an_haendler')
      .map((e) => ({
        id: e.id,
        at: e.at,
        text: String(e.payload.text ?? ''),
        ...(e.payload.photoId ? { photoId: String(e.payload.photoId) } : {}),
      })),
    ...(rated ? { rating: rated.stars } : {}),
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
