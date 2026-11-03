// Welche regelbrechenden Befunde sind noch offen? Für scripts/pitch-tag.sh.
// Ein Befund gilt als offen, solange einer dieser Punkte zutrifft:
//   - sein Regressionstest in __tests__/regressions/ ist noch test.failing,
//   - es gibt dort gar keinen Test zu ihm (auch test.skip zählt nicht),
//   - docs/BEFUNDE.md führt ihn nicht als „behoben“.
// Aufruf: node scripts/open-findings.js [R-xx …]
// Ohne Argumente prüft es die Befunde, die eine feste Regel brechen (ZUKUNFTSPLAN, Pitch-Gate).
// Exit 0, wenn keiner offen ist. Sonst eine Zeile je Grund und Exit 1.
const fs = require('fs');
const path = require('path');

const RULE_BREAKING = ['R-07', 'R-12', 'R-13', 'R-16', 'R-17'];

const root = path.resolve(__dirname, '..');
const testDir = path.join(root, '__tests__', 'regressions');

const custom = process.argv.length > 2;
const ids = custom ? process.argv.slice(2) : RULE_BREAKING;
const tests = fs
  .readdirSync(testDir)
  .filter((f) => /\.test\.tsx?$/.test(f))
  .map((f) => fs.readFileSync(path.join(testDir, f), 'utf8'))
  .join('\n');
const befunde = fs.readFileSync(path.join(root, 'docs', 'BEFUNDE.md'), 'utf8').split('\n');

const open = [];
for (const id of ids) {
  // Der Test zum Befund, nicht die „Ausgangslage“. Der Name kann auf der nächsten Zeile stehen.
  const name = `\\(\\s*['"\`]${id} (?!Ausgangslage)`;
  const failing = new RegExp(`\\b(?:test|it)\\.failing${name}`).test(tests);
  const active = new RegExp(`\\b(?:test|it)${name}`).test(tests);
  if (failing) open.push(`${id}: Der Regressionstest ist noch test.failing.`);
  else if (!active) open.push(`${id}: Kein aktiver Regressionstest in __tests__/regressions/.`);

  const row = befunde.find((line) => line.startsWith(`| ${id} |`));
  const status = row ? row.split('|')[4].trim() : '';
  if (!status.startsWith('behoben')) {
    open.push(`${id}: docs/BEFUNDE.md führt ihn als „${status || 'fehlt'}“, nicht als „behoben“.`);
  }
}

if (open.length > 0) {
  const title = custom ? 'Offene Befunde' : 'Offene Befunde, die eine feste Regel brechen';
  console.error(`${title}:\n  ${open.join('\n  ')}`);
  process.exit(1);
}
console.log(`Keiner offen: ${ids.join(', ')}.`);
