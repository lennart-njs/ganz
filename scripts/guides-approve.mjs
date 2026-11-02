#!/usr/bin/env node
// Freigabe eines Entwurfs aus dem Import (Entscheidung 15). Erst danach zeigt die App die Anleitung.
// Aufruf: node scripts/guides-approve.mjs <id> --von "Name, Firma" [--trotzdem]
// --trotzdem: auch wenn der Import Texte nicht wörtlich im PDF gefunden hat (nach eigener Prüfung).
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(process.cwd(), 'server', 'guides');
const [id, ...rest] = process.argv.slice(2);
const by = rest[rest.indexOf('--von') + 1];
const force = rest.includes('--trotzdem');

if (!id || !rest.includes('--von') || !by || by.startsWith('--')) {
  console.error('Aufruf: node scripts/guides-approve.mjs <id> --von "Name, Firma" [--trotzdem]');
  process.exit(2);
}

const draftFile = path.join(root, 'drafts', `${id}.json`);
if (!fs.existsSync(draftFile)) {
  console.error(`Kein Entwurf: ${draftFile}`);
  process.exit(1);
}
const { importCheck, ...entry } = JSON.parse(fs.readFileSync(draftFile, 'utf8'));
if (importCheck?.misses?.length && !force) {
  console.error(
    `${importCheck.misses.length} Texte stehen nicht wörtlich im PDF. Erst korrigieren oder mit --trotzdem freigeben:\n  ` +
      importCheck.misses.join('\n  '),
  );
  process.exit(1);
}
if (!entry.guides?.length || entry.guides.some((g) => !g.steps?.length)) {
  console.error('Entwurf ohne Anleitungen oder mit leeren Anleitungen.');
  process.exit(1);
}

entry.review = {
  status: 'freigegeben',
  by,
  at: new Date().toISOString(),
  note: entry.review?.note,
};
fs.mkdirSync(path.join(root, 'catalog'), { recursive: true });
const out = path.join(root, 'catalog', `${id}.json`);
fs.writeFileSync(out, JSON.stringify(entry, null, 2) + '\n');
fs.unlinkSync(draftFile);
console.log(`Freigegeben von ${by}: ${out}`);
console.log(
  'Der Server liest den Katalog beim nächsten Start. Die App holt ihn beim nächsten Öffnen.',
);
