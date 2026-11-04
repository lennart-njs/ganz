// Pitch-Gate (scripts/open-findings.js): Ein regelbrechender Befund gilt erst als zu, wenn sein
// Regressionstest aktiv ist und docs/BEFUNDE.md ihn als „behoben“ führt. Ein übersprungener oder
// mit .only markierter Test macht alle Befunde wieder offen (Review vom 03.11.2026, Schritt 28h).
// Die Tests laufen gegen eine Kopie des Scripts in einem leeren Ordner, nie gegen das Repo.
import { execFileSync, spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const root = path.resolve(__dirname, '..');
const script = path.join(root, 'scripts', 'open-findings.js');
const R_ALL = Array.from({ length: 18 }, (_, i) => `R-${String(i + 1).padStart(2, '0')}`);

let dir: string | undefined;

afterEach(() => {
  if (dir) fs.rmSync(dir, { recursive: true, force: true });
  dir = undefined;
});

/** Ein Ordner wie das Repo, mit einer Testdatei in __tests__/regressions/ und einer BEFUNDE-Zeile */
function repoWith(regressions: string, status = 'behoben'): string {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ganz-open-findings-'));
  fs.mkdirSync(path.join(dir, 'scripts'));
  fs.mkdirSync(path.join(dir, '__tests__', 'regressions'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'docs'));
  fs.copyFileSync(script, path.join(dir, 'scripts', 'open-findings.js'));
  fs.writeFileSync(path.join(dir, '__tests__', 'regressions', 'r07.test.tsx'), regressions);
  fs.writeFileSync(
    path.join(dir, 'docs', 'BEFUNDE.md'),
    `| ID | Befund | Wieder offen | Stand | Behebung | Test |\n|---|---|---|---|---|---|\n| R-07 | Befund | B-18 | ${status} | Schritt 22 | Test |\n`,
  );
  return dir;
}

/** Exit-Code und Ausgabe von open-findings.js in diesem Ordner */
function gate(base: string, ...ids: string[]): { code: number; out: string } {
  try {
    const out = execFileSync(
      process.execPath,
      [path.join(base, 'scripts', 'open-findings.js'), ...ids],
      { encoding: 'utf8', stdio: 'pipe' },
    );
    return { code: 0, out };
  } catch (error) {
    const e = error as { status: number; stderr: string };
    return { code: e.status, out: e.stderr };
  }
}

const active = "describe('R-07 Befund', () => {\n  test('R-07 behoben', () => {});\n});\n";

describe('Pitch-Gate', () => {
  test('ein aktiver Test und „behoben“: zu', () => {
    expect(gate(repoWith(active), 'R-07')).toMatchObject({ code: 0 });
  });

  test.each([
    ['test.failing', active.replace("test('R-07", "test.failing('R-07")],
    ['describe.skip', active.replace('describe(', 'describe.skip(')],
    ['test.skip', active.replace("test('R-07", "test.skip('R-07")],
    ['test.only an einem anderen Test', `${active}test.only('anderes', () => {});\n`],
    ['xit', `${active}xit('anderes', () => {});\n`],
    ['nur die Ausgangslage', "test('R-07 Ausgangslage: Aufbau', () => {});\n"],
  ])('%s: offen', (_, source) => {
    const result = gate(repoWith(source), 'R-07');
    expect(result.code).toBe(1);
    expect(result.out).toMatch(/R-07|Alle/);
  });

  // Gegenprüfung zu Schritt 28: Diese Formen fand das Gate nicht
  test.each([
    ['describe.skip.each', active.replace('describe(', 'describe.skip.each([[1]])(')],
    ['xdescribe.each', active.replace('describe(', 'xdescribe.each([[1]])(')],
    ['test.concurrent.skip', `${active}test.concurrent.skip('anderes', async () => {});\n`],
    [
      'Alias',
      `const later = describe.skip;\nlater('R-07 Befund', () => {\n  test('R-07 behoben', () => {});\n});\n`,
    ],
  ])('%s im Quelltext: offen', (_, source) => {
    const result = gate(repoWith(source), 'R-07');
    expect(result.code).toBe(1);
    expect(result.out).toMatch(/Alle/);
  });

  describe('mit dem Ergebnis von Jest', () => {
    type Entry = { title: string; status: string; failing?: boolean };
    /** Schreibt ein Ergebnis wie jest --json für die Testdatei in base */
    function results(base: string, entries: Entry[], file = 'r07.test.tsx'): string {
      const out = path.join(base, 'jest.json');
      const name = path.join(base, '__tests__', 'regressions', file);
      const status = entries.every((e) => e.status === 'passed') ? 'passed' : 'focused';
      const assertionResults = entries.map((e) => ({ failing: false, ...e }));
      fs.writeFileSync(out, JSON.stringify({ testResults: [{ name, status, assertionResults }] }));
      return out;
    }
    const passed: Entry = { title: 'R-07 behoben', status: 'passed' };

    test('grün gelaufen: zu', () => {
      const base = repoWith(active);
      expect(gate(base, '--results', results(base, [passed]), 'R-07')).toMatchObject({ code: 0 });
    });

    const own = 'r07.test.tsx';
    test.each<[string, Entry[], string]>([
      ['übersprungen', [{ ...passed, status: 'pending' }], own],
      ['nur todo daneben', [passed, { title: 'anderes', status: 'todo' }], own],
      ['test.failing', [{ ...passed, failing: true }], own],
      ['rot', [{ ...passed, status: 'failed' }], own],
      [
        'nicht ausgeführt, etwa hinter einem if',
        [{ title: 'R-07 Ausgangslage: Aufbau', status: 'passed' }],
        own,
      ],
      ['Datei nicht gelaufen', [passed], 'andere.test.tsx'],
    ])('%s: offen', (_, entries, file) => {
      const base = repoWith(active);
      const result = gate(base, '--results', results(base, entries, file), 'R-07');
      expect(result.code).toBe(1);
      expect(result.out).toMatch(/R-07|Alle/);
    });

    test('ohne --results sagt das Gate, dass es nur den Quelltext geprüft hat', () => {
      const base = repoWith(active);
      const run = spawnSync(
        process.execPath,
        [path.join(base, 'scripts', 'open-findings.js'), 'R-07'],
        {
          encoding: 'utf8',
        },
      );
      expect(run.status).toBe(0);
      expect(run.stderr).toContain('nur der Quelltext');
    });

    test('pitch-tag.sh ruft das Gate mit dem Ergebnis von Jest auf, vor ci-checks.sh', () => {
      const tag = fs.readFileSync(path.join(root, 'scripts', 'pitch-tag.sh'), 'utf8');
      const jest = tag.indexOf('npx jest __tests__/regressions');
      const gateCall = tag.indexOf('node scripts/open-findings.js --results');
      expect(jest).toBeGreaterThan(0);
      expect(gateCall).toBeGreaterThan(jest);
      expect(tag).toMatch(/--json --outputFile="\$results"/);
    });
  });

  test('BEFUNDE.md ohne „behoben“: offen', () => {
    const result = gate(repoWith(active, 'offen'), 'R-07');
    expect(result.code).toBe(1);
    expect(result.out).toContain('R-07: docs/BEFUNDE.md');
  });

  test('im Repo ist heute keiner von R-01 bis R-18 offen', () => {
    expect(gate(root, ...R_ALL)).toMatchObject({ code: 0 });
    expect(gate(root)).toMatchObject({ code: 0 });
  });
});
