#!/usr/bin/env node
// Import einer Gebrauchsanweisung in den Katalog (Entscheidung 15). Ergebnis ist immer ein ENTWURF.
// Erst nach der Prüfung durch einen Menschen gibt scripts/guides-approve.mjs ihn frei.
//
// Aufruf:
//   node scripts/guides-import.mjs <pdf> --id miele-twb140 --hersteller miele --kategorie trockner \
//     --modell "TWB 140" [--material "12 345 678"] [--titel "Gebrauchsanweisung TWB 140, M.-Nr. …"]
//
// Braucht ANTHROPIC_API_KEY (wie der Reparatur-Assistent, nur auf dem Rechner, nie in der App).
// Schreibt server/guides/drafts/<id>.json und meldet Schritte, deren Text nicht wörtlich im PDF steht.
import Anthropic from '@anthropic-ai/sdk';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const MODEL = 'claude-opus-5-5';
const DRAFTS = path.join(process.cwd(), 'server', 'guides', 'drafts');
const CATEGORIES = ['waschmaschine', 'geschirrspueler', 'trockner', 'kuehlschrank'];

function args(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) out[a.slice(2)] = argv[++i];
    else out._.push(a);
  }
  return out;
}

const STEP = {
  type: 'object',
  properties: {
    t: { type: 'string', description: 'Überschrift des Schritts, wörtlich aus dem PDF' },
    d: { type: 'string', description: 'Text des Schritts, wörtlich aus dem PDF' },
    w: { type: 'string', description: 'Warnhinweis zu diesem Schritt, wörtlich, sonst leer' },
    tool: { type: 'string', description: 'Werkzeug, wenn das PDF eines nennt, sonst leer' },
    page: { type: 'integer', description: 'Seite im PDF, auf der der Text steht' },
  },
  required: ['t', 'd', 'w', 'tool', 'page'],
  additionalProperties: false,
};

const SCHEMA = {
  type: 'object',
  properties: {
    guides: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          slug: { type: 'string', description: 'kurze id, nur a-z, 0-9 und Bindestrich' },
          kind: { type: 'string', enum: ['stoerung', 'pflege', 'hinweis'] },
          title: { type: 'string', description: 'Titel der Störung oder Pflege, wörtlich' },
          code: {
            type: 'string',
            description: 'Meldung im Display, wörtlich, sonst kurzes Stichwort',
          },
          noSelf: {
            type: 'boolean',
            description: 'true, wenn das PDF sagt, dass der Kundendienst gerufen werden muss',
          },
          steps: { type: 'array', items: STEP },
        },
        required: ['slug', 'kind', 'title', 'code', 'noSelf', 'steps'],
        additionalProperties: false,
      },
    },
  },
  required: ['guides'],
  additionalProperties: false,
};

const INSTRUCTIONS = `Du liest die Gebrauchsanweisung eines Hausgeräts und ziehst die Abschnitte heraus, mit denen ein Haushalt eine Störung selbst beheben oder das Gerät pflegen kann.

Regeln:
- Jeder Text (Titel, Schritt, Warnhinweis) steht WÖRTLICH so im PDF. Nicht umformulieren, nicht kürzen, nicht übersetzen, nichts ergänzen. Nur Zeilenumbrüche darfst du durch Leerzeichen ersetzen.
- Ein Schritt ist eine Handlung. Steht im PDF eine nummerierte Liste, wird jeder Punkt ein Schritt.
- Nenn zu jedem Schritt die Seite, auf der er steht.
- Nimm nur, was ein Haushalt ohne Öffnen des Gehäuses, ohne Arbeiten an Strom, Gas oder Kältemittel tun darf. Verweist das PDF auf den Kundendienst, setz noSelf = true und übernimm nur die Schritte davor.
- Warnhinweise gehören zu dem Schritt, vor dem sie im PDF stehen.
- Nichts, was nicht im PDF steht. Lieber eine Anleitung weniger.`;

/** Text des PDFs zum Abgleich. Ohne pdftotext wird der Abgleich übersprungen. */
function pdfText(file) {
  try {
    return execFileSync('pdftotext', ['-layout', file, '-'], { encoding: 'utf8' });
  } catch {
    return undefined;
  }
}

const squash = (x) =>
  x
    .replace(/[\s­-]+/g, ' ')
    .trim()
    .toLowerCase();

async function main() {
  const a = args(process.argv.slice(2));
  const file = a._[0];
  if (!file || !a.id || !a.hersteller || !CATEGORIES.includes(a.kategorie) || !a.modell) {
    console.error(
      'Aufruf: node scripts/guides-import.mjs <pdf> --id <id> --hersteller <id> --kategorie <' +
        CATEGORIES.join('|') +
        '> --modell "<Modell>" [--material "<M.-Nr.>"] [--titel "<Titel der Anleitung>"]',
    );
    process.exit(2);
  }
  if (!/^[a-z0-9-]+$/.test(a.id)) throw new Error('--id nur mit a-z, 0-9 und Bindestrich');

  const pdf = fs.readFileSync(file).toString('base64');
  const title = a.titel ?? `Gebrauchsanweisung ${a.modell}`;
  const client = new Anthropic();
  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: 64000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'high', format: { type: 'json_schema', schema: SCHEMA } },
    system: INSTRUCTIONS,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: pdf },
          },
          { type: 'text', text: `Gerät: ${a.modell}. Zieh die Anleitungen heraus.` },
        ],
      },
    ],
  });
  const message = await stream.finalMessage();
  if (message.stop_reason === 'refusal') throw new Error('Abgelehnt. Kein Entwurf geschrieben.');
  if (message.stop_reason === 'max_tokens') throw new Error('Antwort zu lang. PDF teilen.');
  const text = message.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');
  const { guides } = JSON.parse(text);

  const entry = {
    id: a.id,
    manufacturerId: a.hersteller,
    category: a.kategorie,
    models: [a.modell],
    materialNumbers: a.material ? [a.material] : [],
    document: { title, license: 'hersteller' },
    review: {
      status: 'entwurf',
      note: `Import aus ${path.basename(file)} am ${new Date().toISOString()}`,
    },
    origin: 'import',
    guides: guides.map((g) => ({
      id: `${a.id}/${g.slug}`,
      kind: g.kind,
      title: g.title,
      code: g.code,
      ...(g.noSelf ? { noSelf: true } : {}),
      sourceDocument: title,
      steps: g.steps.map((s) => ({
        t: s.t,
        d: s.d,
        ...(s.w ? { w: s.w } : {}),
        ...(s.tool ? { tool: s.tool } : {}),
        page: s.page,
      })),
    })),
  };

  // Abgleich: steht jeder Text wörtlich im PDF?
  const source = pdfText(file);
  const misses = [];
  if (source) {
    const hay = squash(source);
    for (const g of entry.guides) {
      g.steps.forEach((s, i) => {
        for (const key of ['t', 'd', 'w']) {
          if (s[key] && !hay.includes(squash(s[key])))
            misses.push(`${g.id} Schritt ${i + 1} ${key}`);
        }
      });
    }
  }

  fs.mkdirSync(DRAFTS, { recursive: true });
  const out = path.join(DRAFTS, `${a.id}.json`);
  fs.writeFileSync(
    out,
    JSON.stringify({ ...entry, importCheck: { misses, checked: !!source } }, null, 2),
  );
  console.log(`Entwurf: ${out}`);
  console.log(
    `${entry.guides.length} Anleitungen, ${entry.guides.reduce((n, g) => n + g.steps.length, 0)} Schritte`,
  );
  if (!source) console.log('Achtung: pdftotext fehlt, kein wörtlicher Abgleich.');
  else if (misses.length)
    console.log(`Nicht wörtlich gefunden (${misses.length}):\n  ${misses.join('\n  ')}`);
  else console.log('Alle Texte stehen wörtlich im PDF.');
  console.log(
    'Nächster Schritt: prüfen, dann node scripts/guides-approve.mjs ' + a.id + ' --von "<Name>"',
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
