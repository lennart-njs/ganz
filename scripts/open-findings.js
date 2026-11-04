// Welche regelbrechenden Befunde sind noch offen? Für scripts/pitch-tag.sh.
// Ein Befund gilt als offen, solange einer dieser Punkte zutrifft:
//   - sein Regressionstest in __tests__/regressions/ ist noch test.failing,
//   - es gibt dort gar keinen Test zu ihm (auch test.skip zählt nicht),
//   - in __tests__/regressions/ ist irgendein Test übersprungen oder mit .only markiert
//     (describe.skip, describe.skip.each, xit, test.only …). Dann läuft nicht sicher jeder
//     Regressionstest.
//   - docs/BEFUNDE.md führt ihn nicht als „behoben“.
// Mit --results prüft es dazu das Ergebnis von Jest (jest __tests__/regressions --json):
//   - jeder Test zum Befund ist gelaufen und grün (status passed, nicht test.failing),
//   - kein Test ist übersprungen, offen (todo) oder fehlt, jede Testdatei ist gelaufen.
// Das findet auch, was der Quelltext nicht verrät, etwa describe.each([]) oder einen Test hinter
// einem if. scripts/pitch-tag.sh ruft es immer mit --results auf. Ohne --results prüft es nur den
// Quelltext und sagt das.
// Aufruf: node scripts/open-findings.js [--results jest.json] [R-xx …]
// Ohne R-xx prüft es die Befunde, die eine feste Regel brechen (ZUKUNFTSPLAN, Pitch-Gate).
// Exit 0, wenn keiner offen ist. Sonst eine Zeile je Grund und Exit 1.
const fs = require('fs');
const path = require('path');

const RULE_BREAKING = ['R-07', 'R-12', 'R-13', 'R-16', 'R-17'];

const root = path.resolve(__dirname, '..');
const testDir = path.join(root, '__tests__', 'regressions');

const args = process.argv.slice(2);
const at = args.indexOf('--results');
const resultsFile = at >= 0 ? args[at + 1] : undefined;
if (at >= 0 && !resultsFile) {
  console.error('Aufruf: node scripts/open-findings.js [--results jest.json] [R-xx …]');
  process.exit(2);
}
const rest = at >= 0 ? [...args.slice(0, at), ...args.slice(at + 2)] : args;
const custom = rest.length > 0;
const ids = custom ? rest : RULE_BREAKING;

const files = fs.readdirSync(testDir).filter((f) => /\.test\.tsx?$/.test(f));
const tests = files.map((f) => fs.readFileSync(path.join(testDir, f), 'utf8')).join('\n');
const befunde = fs.readFileSync(path.join(root, 'docs', 'BEFUNDE.md'), 'utf8').split('\n');

const open = [];
// Ein übersprungener Block oder ein .only irgendwo, und kein Befund gilt als sicher zu. Auch
// verkettet (describe.skip.each, test.concurrent.skip) und ohne Klammer dahinter (ein Alias).
// Der Text des Codes reicht dafür, Kommentare mit diesen Wörtern gibt es dort nicht.
const skipped = tests.match(
  /\b(?:describe|test|it)(?:\.\w+)*\.(?:skip|only|todo)\b|\bx(?:describe|test|it)\b|\bf(?:describe|it)\b/,
);
if (skipped) {
  open.push(`Alle: In __tests__/regressions/ steht „${skipped[0]}“.`);
}

/** Ergebnis von Jest: alle Tests aus __tests__/regressions/ mit Titel und Status */
function readResults(file) {
  const report = JSON.parse(fs.readFileSync(file, 'utf8'));
  const ran = (report.testResults ?? []).filter((r) => r.name?.startsWith(testDir + path.sep));
  const missing = files.filter((f) => !ran.some((r) => path.basename(r.name) === f));
  if (missing.length) open.push(`Alle: Jest hat ${missing.join(', ')} nicht ausgeführt.`);
  const all = ran.flatMap((r) => r.assertionResults ?? []);
  const notRun = all.filter((a) => a.status !== 'passed' && a.status !== 'failed');
  if (notRun.length) {
    open.push(
      `Alle: ${notRun.length} Tests in __tests__/regressions/ liefen nicht (${notRun[0].status}).`,
    );
  }
  if (ran.some((r) => r.status !== 'passed') || all.some((a) => a.status === 'failed')) {
    open.push('Alle: Ein Regressionstest ist rot.');
  }
  return all;
}

const results = resultsFile ? readResults(resultsFile) : undefined;
if (!results) {
  console.error('Hinweis: ohne --results nur der Quelltext geprüft, nicht das Ergebnis von Jest.');
}

for (const id of ids) {
  // Der Test zum Befund, nicht die „Ausgangslage“. Der Name kann auf der nächsten Zeile stehen.
  const name = `\\(\\s*['"\`]${id} (?!Ausgangslage)`;
  const failing = new RegExp(`\\b(?:test|it)\\.failing${name}`).test(tests);
  const active = new RegExp(`\\b(?:test|it)${name}`).test(tests);
  if (failing) open.push(`${id}: Der Regressionstest ist noch test.failing.`);
  else if (!active) open.push(`${id}: Kein aktiver Regressionstest in __tests__/regressions/.`);

  if (results) {
    const own = results.filter(
      (a) => a.title?.startsWith(`${id} `) && !a.title.startsWith(`${id} Ausgangslage`),
    );
    if (own.length === 0) open.push(`${id}: Jest hat keinen Test zu ihm ausgeführt.`);
    else if (own.some((a) => a.status !== 'passed' || a.failing)) {
      open.push(`${id}: Ein Test zu ihm ist nicht grün gelaufen.`);
    }
  }

  const row = befunde.find((line) => line.startsWith(`| ${id} |`));
  const status = row ? row.split('|')[4].trim() : '';
  if (!status.startsWith('behoben')) {
    open.push(`${id}: docs/BEFUNDE.md führt ihn als „${status || 'fehlt'}“, nicht als „behoben“.`);
  }
}

if (open.length > 0) {
  const title = custom ? 'Offene Befunde' : 'Offene Befunde, die eine feste Regel brechen';
  console.error(`${title}:\n  ${[...new Set(open)].join('\n  ')}`);
  process.exit(1);
}
console.log(`Keiner offen: ${ids.join(', ')}.`);
