// Beispielfälle für das Händlerportal (Demo). Namen und Preise aus config/demo.config.ts.
import { demoConfig } from '@/config/demo.config';
import { findModel, manufacturers } from '@/data/catalog';
import { getGuide } from '@/lib/guideCatalog';
import { de } from '@/i18n/de';
import { caseStatusLabel } from '@/lib/caseView';
import { SHARE_FORMAT_VERSION, type SharedCaseRecord } from '@/model/sharing';
import type { CaseEvent } from '@/model/types';

const cfg = demoConfig;

const ago = (days: number, hours = 0) =>
  new Date(Date.now() - days * 86_400_000 - hours * 3_600_000).toISOString();

export function seedRecords(): SharedCaseRecord[] {
  return cfg.portalExamples.map((x, i) => {
    const d = cfg.dealers.find((y) => y.id === x.dealerId) ?? cfg.dealers[0]!;
    const dealer = { id: d.id, kind: 'haendler' as const, name: d.name };
    const model = findModel({ manufacturerId: x.manufacturerId, model: x.model });
    const created = ago(x.daysAgo, 2);
    const shared = ago(x.daysAgo, 1);
    const washing = x.category === 'waschmaschine';
    const a = de.appliance[x.category];
    const ablauf = getGuide(model?.patterns.ablauf ?? 'ablauf')!;
    // Abbruch im vorletzten Schritt, wie bei „Geht nicht“
    const stop = Math.max(0, ablauf.steps.length - 2);
    const problem = washing ? ablauf.title : (a.symptoms[0]?.label ?? '');
    const status = washing ? ('in_reparatur' as const) : ('eskaliert' as const);
    const timeline = [
      { at: created, type: 'fall_angelegt' as const, label: de.caseEvent.fall_angelegt },
      ...(washing
        ? [
            {
              at: created,
              type: 'anleitung_gestartet' as const,
              label: de.caseEvent.anleitung_gestartet,
            },
            {
              at: created,
              type: 'schritt_geht_nicht' as const,
              label: de.caseEvent.schritt_geht_nicht,
            },
            { at: created, type: 'befund_erstellt' as const, label: de.caseEvent.befund_erstellt },
          ]
        : [
            {
              at: created,
              type: 'status_geaendert' as const,
              label: de.caseEvent.status_geaendert,
            },
          ]),
      {
        at: shared,
        type: 'weitergabe_bestaetigt' as const,
        label: de.caseEvent.weitergabe_bestaetigt,
      },
    ].map((e) => ({ ...e, actor: de.app.name }));
    const retailerEvents: CaseEvent[] = washing
      ? [
          {
            id: `hev_seed_${i}_1`,
            caseId: x.caseId,
            type: 'haendler_angenommen',
            at: ago(x.daysAgo - 1),
            actor: { kind: 'haendler', id: dealer.id, name: dealer.name },
            payload: { by: ('portalUser' in d && d.portalUser) || d.name },
          },
        ]
      : [];
    const repairTotal = cfg.prices.repair.parts + cfg.prices.repair.labor;
    return {
      file: {
        version: SHARE_FORMAT_VERSION,
        caseId: x.caseId,
        recipient: dealer,
        consentId: `consent_seed_${i}`,
        sharedAt: shared,
        updatedAt: retailerEvents.at(-1)?.at ?? shared,
        isExample: true,
        customer: { name: x.customer, address: x.address },
        device: {
          manufacturer: manufacturers[x.manufacturerId] ?? x.manufacturerId,
          model: x.model,
          category: x.category,
          categoryLabel: de.deviceCategory[x.category],
          purchaseDate: x.purchaseDate,
          soldBy: dealer,
        },
        case: {
          status,
          statusLabel: caseStatusLabel(status),
          entry: washing ? 'meldung' : 'symptom',
          problemLabel: problem,
          createdAt: created,
          updatedAt: shared,
        },
        results: washing
          ? [
              {
                component: 'Laugenfilter / Laugenpumpe',
                displayMessage: 'Wasserablauf',
                confidence: 'hoch',
                source: 'nutzerangabe',
                at: created,
              },
            ]
          : [],
        guide: washing
          ? {
              title: ablauf.title,
              source: model?.manual ?? ablauf.sourceDocument,
              total: ablauf.steps.length,
              completed: ablauf.steps.slice(0, stop).map((st) => st.t),
              abortedAt: { step: stop + 1, title: ablauf.steps[stop]?.t ?? '' },
              note: 'Pumpenflügel klemmt',
              outcome: 'geht_nicht',
            }
          : undefined,
        finding: washing
          ? {
              label: a.finding.title,
              by: `${cfg.expert.name}, Fachkraft im Videocall`,
              at: created,
            }
          : undefined,
        quote: washing
          ? {
              repair: {
                partName: a.finding.part,
                originalPart: true,
                parts: cfg.prices.repair.parts,
                labor: cfg.prices.repair.labor,
                total: repairTotal,
              },
              replacement: { total: cfg.prices.replacement, note: '' },
              saving: cfg.prices.replacement - repairTotal,
              payer: { kind: 'haendler', name: dealer.name },
              deductible: 0,
              isExample: true,
            }
          : undefined,
        photos: [
          {
            id: `photo_seed_${i}`,
            takenAt: created,
            purpose: washing ? 'display' : 'bauteil',
            source: 'demo',
          },
        ],
        timeline,
        answers: [],
      },
      retailerEvents,
    };
  });
}
