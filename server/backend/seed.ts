// Beispielfälle für das Händlerportal (Demo, Entscheidung 37). Rund 40 Fälle mit Weitergabe und
// anonyme Zahlen für die Auswertung, verteilt über zwölf Wochen. Zufall mit festem Startwert,
// damit die Demo jedes Mal gleich aussieht. Namen und Preise aus config/.
import { demoConfig } from '@/config/demo.config';
import { fruendSettings, portalSeed } from '@/config/portal.demo';
import { catalog, manufacturers } from '@/data/catalog';
import { de } from '@/i18n/de';
import { caseStatusLabel } from '@/lib/caseView';
import { getGuide } from '@/lib/guideCatalog';
import {
  fillTemplate,
  type AnonymousOutcome,
  type DealerSettings,
  type WorkflowStatus,
} from '@/model/portal';
import {
  SHARE_FORMAT_VERSION,
  retailerEventType,
  type RetailerAction,
  type SharedCaseFile,
  type SharedCaseRecord,
} from '@/model/sharing';
import type { CaseEvent, CaseResolution, CaseStatus, DeviceCategory } from '@/model/types';

const H = 3_600_000;
const D = 24 * H;

/** Zufall mit festem Startwert (mulberry32) */
function random(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface SeedDevice {
  manufacturer: string;
  model: string;
  category: DeviceCategory;
  problems: string[];
  /** Anleitung aus der Gebrauchsanweisung, falls im Katalog */
  guide?: { title: string; source: string; steps: string[] };
}

function seedDevices(): SeedDevice[] {
  const fromCatalog = catalog.map((m): SeedDevice => {
    const g = getGuide(m.patterns.ablauf);
    const problems = m.problems?.length
      ? m.problems.map((p) => p.label)
      : m.category === 'waschmaschine'
        ? de.problems.map((p) => p.label)
        : de.appliance[m.category].symptoms.map((s) => s.label);
    return {
      manufacturer: manufacturers[m.manufacturerId] ?? m.manufacturerId,
      model: m.model,
      category: m.category,
      problems,
      guide: g ? { title: g.title, source: m.manual, steps: g.steps.map((s) => s.t) } : undefined,
    };
  });
  const others = portalSeed.otherDevices.map((d): SeedDevice => ({
    manufacturer: d.manufacturer,
    model: d.model,
    category: d.category,
    problems: [d.problem, ...de.appliance[d.category].symptoms.map((s) => s.label)],
  }));
  return [...fromCatalog, ...others];
}

/** So laufen die offenen Beispielfälle. Der Rest ist erledigt. */
const openPlan: { status: WorkflowStatus; hoursAgo: number; overdue?: boolean }[] = [
  { status: 'neu', hoursAgo: 0.4 },
  { status: 'neu', hoursAgo: 1.5 },
  { status: 'neu', hoursAgo: 3.2 },
  { status: 'neu', hoursAgo: 6.5, overdue: true },
  { status: 'wartet_uns', hoursAgo: 2 },
  { status: 'wartet_uns', hoursAgo: 9 },
  { status: 'wartet_uns', hoursAgo: 20 },
  { status: 'wartet_uns', hoursAgo: 40, overdue: true },
  { status: 'wartet_uns', hoursAgo: 52, overdue: true },
  { status: 'wartet_kunde', hoursAgo: 5 },
  { status: 'wartet_kunde', hoursAgo: 26 },
  { status: 'wartet_kunde', hoursAgo: 49 },
  { status: 'wartet_kunde', hoursAgo: 75 },
  { status: 'termin', hoursAgo: 28 },
  { status: 'termin', hoursAgo: 46 },
  { status: 'termin', hoursAgo: 70 },
  { status: 'termin', hoursAgo: 96 },
];

const iso = (t: number) => new Date(t).toISOString();

export function seedSettings(): Record<string, DealerSettings> {
  return { fruend: structuredClone(fruendSettings) };
}

export function seedRecords(now = Date.now()): SharedCaseRecord[] {
  const r = random(24816);
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(r() * arr.length)]!;
  const chance = (p: number) => r() < p;
  const s = fruendSettings;
  const d = demoConfig.dealers.find((x) => x.id === 'fruend')!;
  const dealer = { id: d.id, kind: 'haendler' as const, name: d.name };
  const devices = seedDevices();
  const team = s.team.filter((m) => m.active && m.role !== 'lesen');
  const by = (id: string | undefined) =>
    s.team.find((m) => m.id === id)?.name ?? s.profile.shortName;

  // Zeitpunkt der Weitergabe: offene Fälle nach Plan, erledigte über die zwölf Wochen verteilt
  const plans = Array.from({ length: portalSeed.cases }, (_, i) => {
    const open = openPlan[i];
    const sharedAt = open ? now - open.hoursAgo * H : now - (5 + r() * (portalSeed.days - 6)) * D;
    return { open, sharedAt };
  }).sort((a, b) => b.sharedAt - a.sharedAt);

  return plans.map(({ open, sharedAt }, i): SharedCaseRecord => {
    const status: WorkflowStatus = open?.status ?? 'erledigt';
    const caseId = `GS-${24816 - i * 3 - Math.floor(r() * 3)}`;
    const dev = devices[i % devices.length]!;
    const a = de.appliance[dev.category];
    const problem = pick(dev.problems);
    const customer = pick(portalSeed.customers);
    const first = customer.split(' ')[0]!;
    const place = pick(portalSeed.cities);
    // Kaufdatum: meist in der Gewährleistung, manche knapp danach (Kulanz), manche lange her
    const monthsOld = chance(0.65) ? 2 + r() * 20 : chance(0.5) ? 24.5 + r() * 5 : 32 + r() * 30;
    const purchase = iso(sharedAt - monthsOld * 30.4 * D);
    const insured = monthsOld > 30 && chance(0.6);
    const created = sharedAt - (0.2 + r()) * H;
    const withGuide = !!dev.guide && chance(0.75);
    const stop = dev.guide ? Math.max(1, dev.guide.steps.length - 1 - Math.floor(r() * 2)) : 0;
    const withProof = chance(0.45);
    const withFinding = status !== 'neu' && chance(0.5);

    const events: CaseEvent[] = [];
    let n = 0;
    const ev = (
      at: number,
      action: RetailerAction,
      who: string,
      extra: Record<string, unknown> = {},
    ) => {
      const { type: _t, ...payload } = action;
      const e: CaseEvent = {
        id: `hev_seed_${i}_${n++}`,
        caseId,
        type: retailerEventType[action.type],
        at: iso(Math.min(at, now - 60_000)),
        actor: { kind: 'haendler', id: dealer.id, name: dealer.name },
        payload: { ...payload, by: who, ...extra },
      };
      events.push(e);
      return e;
    };
    const answers: SharedCaseFile['answers'] = [];
    const messages: NonNullable<SharedCaseFile['messages']> = [];
    const values = {
      kunde: first,
      fall: caseId,
      haendler: s.profile.shortName,
      telefon: s.profile.phone,
    };

    // Regeln beim Eingang: Begrüßung, Kaufbeleg anfordern
    ev(
      sharedAt + 30_000,
      { type: 'nachricht', text: fillTemplate(s.messages.greeting.text, values) },
      s.profile.shortName,
      {
        auto: true,
        contact: {
          name: s.service.serviceName,
          phone: s.profile.phone,
          email: s.profile.email,
          hours: s.profile.hours,
        },
      },
    );
    const beleg = s.messages.questions.find((q) => q.id === 'beleg')!;
    let proofAsked: CaseEvent | undefined;
    if (!withProof)
      proofAsked = ev(
        sharedAt + 40_000,
        { type: 'rueckfrage', question: beleg.question, options: beleg.options },
        s.profile.shortName,
        { auto: true },
      );

    const assignee =
      status === 'neu' && chance(0.5)
        ? undefined
        : (s.rules.autoAssign.find((x) => x.category === dev.category)?.assigneeId ??
          pick(team).id);
    const worker = by(assignee);
    const span = Math.min(open ? open.hoursAgo * H : (1 + r() * 9) * D, now - sharedAt) * 0.9;
    // Zeit nach der Weitergabe, als Anteil der Spanne
    const t = (f: number) => sharedAt + span * f;

    if (status !== 'neu') {
      ev(t(0.08), { type: 'annehmen' }, worker);
      if (proofAsked)
        answers.push({
          questionEventId: proofAsked.id,
          answer: beleg.options[0]!,
          at: iso(t(0.12)),
        });
      if (chance(0.5))
        messages.push({
          id: `msg_seed_${i}_0`,
          at: iso(t(0.14)),
          text: pick(portalSeed.customerMessages),
        });
    }
    const decision =
      monthsOld < s.rules.warrantyMonths
        ? 'gewaehrleistung'
        : monthsOld < s.rules.warrantyMonths + s.rules.goodwillMonths
          ? 'kulanz'
          : insured
            ? 'an_versicherer'
            : 'abgelehnt';
    const decided =
      status === 'termin' || status === 'erledigt' || (status === 'wartet_kunde' && chance(0.5));
    if (decided) ev(t(0.2), { type: 'entscheidung', decision }, worker);
    if (status === 'wartet_uns') {
      ev(t(0.25), { type: 'nachricht', text: pick(portalSeed.dealerMessages) }, worker);
      messages.push({
        id: `msg_seed_${i}_1`,
        at: iso(open?.overdue ? t(0.3) : t(0.85)),
        text: pick(portalSeed.customerMessages),
      });
    }
    if (status === 'wartet_kunde') {
      if (chance(0.5)) {
        const q = pick(s.messages.questions.filter((x) => x.id !== 'beleg'));
        ev(t(0.6), { type: 'rueckfrage', question: q.question, options: q.options }, worker);
      } else {
        ev(
          t(0.6),
          {
            type: 'termin',
            partnerName: s.service.serviceName,
            slots: s.service.slots.slice(0, 3),
          },
          worker,
        );
      }
    }
    const part = pick(portalSeed.parts);
    const repairs = decided && decision !== 'abgelehnt' && decision !== 'an_versicherer';
    if ((status === 'termin' || status === 'erledigt') && repairs) {
      if (chance(0.6))
        ev(t(0.3), { type: 'ersatzteil', part, status: 'bestellt', eta: '3 Werktage' }, worker);
      const offer = ev(
        t(0.4),
        { type: 'termin', partnerName: s.service.serviceName, slots: s.service.slots.slice(0, 3) },
        worker,
      );
      const slot = pick(s.service.slots.slice(0, 3));
      answers.push({ questionEventId: offer.id, answer: slot, at: iso(t(0.5)) });
      ev(
        t(0.5) + 60_000,
        { type: 'betrieb', partnerName: s.service.serviceName, slot },
        s.profile.shortName,
        { auto: true },
      );
    }
    if (status === 'erledigt') {
      if (repairs) ev(t(0.8), { type: 'ersatzteil', part, status: 'geliefert' }, worker);
      ev(t(1), { type: 'status', status: 'abgeschlossen' }, worker);
    }

    const resolution: CaseResolution | undefined =
      status !== 'erledigt'
        ? undefined
        : repairs
          ? pick(['repariert', 'ersatzteil_eingebaut'] as const)
          : decision === 'an_versicherer'
            ? 'repariert'
            : 'ersatzgeraet';
    const caseStatus: CaseStatus =
      status === 'erledigt' ? 'erledigt' : status === 'termin' ? 'in_reparatur' : 'eskaliert';
    const updatedAt = Math.max(
      sharedAt,
      ...events.map((e) => Date.parse(e.at)),
      ...answers.map((x) => Date.parse(x.at)),
      ...messages.map((x) => Date.parse(x.at)),
    );
    const lastCustomer = Math.max(
      sharedAt,
      ...answers.map((x) => Date.parse(x.at)),
      ...messages.map((x) => Date.parse(x.at)),
    );
    const since =
      status === 'neu' ? sharedAt : Math.max(...events.map((e) => Date.parse(e.at)), lastCustomer);

    const timeline: SharedCaseFile['timeline'] = [
      { at: iso(created), type: 'fall_angelegt' as const, label: de.caseEvent.fall_angelegt },
      ...(withGuide
        ? [
            {
              at: iso(created + 60_000),
              type: 'anleitung_gestartet' as const,
              label: de.caseEvent.anleitung_gestartet,
            },
            {
              at: iso(created + 9 * 60_000),
              type: 'schritt_geht_nicht' as const,
              label: de.caseEvent.schritt_geht_nicht,
            },
          ]
        : []),
      ...(withFinding
        ? [
            {
              at: iso(created + 20 * 60_000),
              type: 'befund_erstellt' as const,
              label: de.caseEvent.befund_erstellt,
            },
          ]
        : []),
      {
        at: iso(sharedAt),
        type: 'weitergabe_bestaetigt' as const,
        label: de.caseEvent.weitergabe_bestaetigt,
      },
    ].map((e) => ({ ...e, actor: de.app.name }));

    const repairTotal = demoConfig.prices.repair.parts + demoConfig.prices.repair.labor;
    const file: SharedCaseFile = {
      version: SHARE_FORMAT_VERSION,
      caseId,
      recipient: dealer,
      consentId: `consent_seed_${i}`,
      sharedAt: iso(sharedAt),
      updatedAt: iso(updatedAt),
      isExample: true,
      customer: {
        name: customer,
        address: {
          street: `${pick(portalSeed.streets)} ${1 + Math.floor(r() * 40)}`,
          zip: place.zip,
          city: place.city,
        },
      },
      device: {
        manufacturer: dev.manufacturer,
        model: dev.model,
        category: dev.category,
        categoryLabel: de.deviceCategory[dev.category],
        serialNumber: chance(0.7)
          ? `${100 + Math.floor(r() * 899)}/${10_000_000 + Math.floor(r() * 89_999_999)}`
          : undefined,
        purchaseDate: purchase,
        soldBy: dealer,
      },
      protection: insured
        ? {
            provider: demoConfig.insurers[1]!.name,
            product: demoConfig.contract.productName,
            validUntil: iso(sharedAt + 400 * D),
          }
        : undefined,
      case: {
        status: caseStatus,
        statusLabel: caseStatusLabel(caseStatus),
        entry: withGuide ? 'meldung' : 'symptom',
        problemLabel: withGuide && dev.guide ? dev.guide.title : problem,
        createdAt: iso(created),
        updatedAt: iso(updatedAt),
        ...(status === 'erledigt' ? { closedAt: iso(t(1)), resolution } : {}),
      },
      results: withFinding
        ? [
            {
              component: a.finding.component,
              confidence: chance(0.7) ? 'hoch' : 'mittel',
              source: 'fachkraft',
              at: iso(created + 20 * 60_000),
            },
          ]
        : [],
      guide:
        withGuide && dev.guide
          ? {
              title: dev.guide.title,
              source: dev.guide.source,
              total: dev.guide.steps.length,
              completed: dev.guide.steps.slice(0, stop),
              abortedAt: { step: stop + 1, title: dev.guide.steps[stop] ?? '' },
              outcome: 'geht_nicht',
            }
          : undefined,
      finding: withFinding
        ? {
            label: a.finding.title,
            by: `${d.service!.expert}, Fachkraft im Videocall`,
            at: iso(created + 20 * 60_000),
          }
        : undefined,
      quote:
        withFinding && repairs
          ? {
              repair: {
                partName: a.finding.part,
                originalPart: true,
                parts: demoConfig.prices.repair.parts,
                labor: demoConfig.prices.repair.labor,
                total: repairTotal,
              },
              replacement: { total: demoConfig.prices.replacement, note: '' },
              saving: demoConfig.prices.replacement - repairTotal,
              payer: { kind: 'haendler', name: dealer.name },
              deductible: 0,
              isExample: true,
            }
          : undefined,
      photos: [
        {
          id: `photo_seed_${i}_0`,
          takenAt: iso(created),
          purpose: withGuide ? 'display' : 'bauteil',
          source: 'demo',
        },
        ...(withProof || (proofAsked && status !== 'neu')
          ? [
              {
                id: `photo_seed_${i}_1`,
                takenAt: iso(withProof ? created : t(0.12)),
                purpose: 'kaufbeleg' as const,
                source: 'demo' as const,
              },
            ]
          : []),
      ],
      timeline,
      answers,
      messages,
      ...(status === 'erledigt' && repairs && chance(0.85)
        ? { rating: chance(0.75) ? 5 : chance(0.7) ? 4 : 3 }
        : {}),
    };

    const notes = chance(status === 'erledigt' ? 0.2 : 0.4)
      ? [{ id: `note_seed_${i}`, at: iso(t(0.22)), by: worker, text: pick(portalSeed.notes) }]
      : [];
    const opened = status === 'neu' ? [] : [{ at: iso(t(0.07)), by: worker }];
    return {
      file,
      retailerEvents: events,
      workflow: {
        status,
        assigneeId: assignee,
        since: iso(since),
        lastCustomerAt: iso(lastCustomer),
        ...(opened.length ? { seenAt: opened[0]!.at } : {}),
      },
      notes,
      access: opened,
    };
  });
}

/** Anonyme Zahlen: Fälle an Geräten von Fründ, die ohne Weitergabe gelöst wurden oder woanders hin gingen */
export function seedAnonymous(now = Date.now()): Record<string, AnonymousOutcome[]> {
  const r = random(4711);
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(r() * arr.length)]!;
  const devices = seedDevices();
  const list = Array.from({ length: portalSeed.anonymous }, (): AnonymousOutcome => {
    const dev = pick(devices);
    const x = r();
    // Mehr Fälle in den letzten Wochen: die App ist neu bei Fründ
    const age = Math.pow(r(), 0.8) * portalSeed.days;
    return {
      at: iso(now - age * D - r() * D),
      category: dev.category,
      model: `${dev.manufacturer} ${dev.model}`,
      outcome:
        x < 0.56
          ? 'selbst_geloest'
          : x < 0.77
            ? 'im_call_geloest'
            : x < 0.86
              ? 'versicherer'
              : 'betrieb',
      problem: dev.guide && r() < 0.5 ? dev.guide.title : pick(dev.problems),
    };
  }).sort((a, b) => b.at.localeCompare(a.at));
  return { fruend: list };
}
