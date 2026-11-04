// scripts/commit-if-green.sh prüft den Arbeitsbaum, committet aber nur, was bereitliegt. Darum
// bricht es ab, solange etwas nicht bereitliegt (Gegenprüfung zu Schritt 28). Die Tests laufen in
// einem eigenen Git-Repo unter dem Temp-Verzeichnis, mit einer ci-checks.sh, die nur „grün“ sagt.
import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const root = path.resolve(__dirname, '..');
const script = path.join(root, 'scripts', 'commit-if-green.sh');

let dir: string | undefined;

afterEach(() => {
  if (dir) fs.rmSync(dir, { recursive: true, force: true });
  dir = undefined;
});

/** Git ohne die Einstellungen des Rechners, mit festem Namen */
const env = {
  ...process.env,
  GIT_CONFIG_GLOBAL: os.devNull,
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_AUTHOR_NAME: 'Test',
  GIT_AUTHOR_EMAIL: 'test@example.org',
  GIT_COMMITTER_NAME: 'Test',
  GIT_COMMITTER_EMAIL: 'test@example.org',
};

function git(...args: string[]): string {
  const run = spawnSync('git', args, { cwd: dir, env, encoding: 'utf8' });
  if (run.status !== 0) throw new Error(run.stderr);
  return run.stdout.trim();
}

/** Ein Repo mit dem Script, einer grünen ci-checks.sh und einer committeten Datei */
function repo() {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ganz-commit-if-green-'));
  fs.mkdirSync(path.join(dir, 'scripts'));
  fs.copyFileSync(script, path.join(dir, 'scripts', 'commit-if-green.sh'));
  fs.writeFileSync(path.join(dir, 'scripts', 'ci-checks.sh'), '#!/usr/bin/env bash\necho grün\n');
  fs.chmodSync(path.join(dir, 'scripts', 'commit-if-green.sh'), 0o755);
  fs.chmodSync(path.join(dir, 'scripts', 'ci-checks.sh'), 0o755);
  fs.writeFileSync(path.join(dir, 'alt.txt'), 'alt\n');
  git('init', '-q');
  git('add', '-A');
  git('commit', '-q', '-m', 'Anfang');
  return dir;
}

const write = (name: string, text: string) => fs.writeFileSync(path.join(dir!, name), text);
const commits = () => Number(git('rev-list', '--count', 'HEAD'));
const commitIfGreen = () =>
  // Das Protokoll einer roten Prüfung landet im Test-Ordner und geht mit ihm weg
  spawnSync('bash', ['scripts/commit-if-green.sh', '-q', '-m', 'Neu'], {
    cwd: dir,
    env: { ...env, TMPDIR: dir },
    encoding: 'utf8',
  });

describe('commit-if-green.sh', () => {
  test('nur Bereitgelegtes: grün geprüft, dann committet', () => {
    repo();
    write('neu.txt', 'neu\n');
    git('add', 'neu.txt');
    const run = commitIfGreen();
    expect(run.status).toBe(0);
    expect(commits()).toBe(2);
    expect(git('status', '--porcelain')).toBe('');
  });

  test('eine neue Datei ohne git add: kein Commit, die Prüfung gälte nicht für ihn', () => {
    repo();
    write('test.txt', 'braucht quelle.txt\n');
    git('add', 'test.txt');
    write('quelle.txt', 'nicht bereit\n');
    const run = commitIfGreen();
    expect(run.status).toBe(1);
    expect(run.stderr).toContain('Nicht alles liegt bereit');
    expect(run.stderr).toContain('quelle.txt');
    expect(commits()).toBe(1);
  });

  test('eine geänderte Datei ohne git add: kein Commit', () => {
    repo();
    write('neu.txt', 'neu\n');
    git('add', 'neu.txt');
    write('alt.txt', 'geändert, nicht bereit\n');
    expect(commitIfGreen().status).toBe(1);
    expect(commits()).toBe(1);
  });

  test('nichts bereitgelegt: kein Commit', () => {
    repo();
    const run = commitIfGreen();
    expect(run.status).toBe(1);
    expect(run.stderr).toContain('nichts bereit');
    expect(commits()).toBe(1);
  });

  test('rote Prüfung: kein Commit', () => {
    repo();
    write('scripts/ci-checks.sh', '#!/usr/bin/env bash\necho rot\nexit 1\n');
    git('add', '-A');
    const run = commitIfGreen();
    expect(run.status).toBe(1);
    expect(run.stdout).toContain('CHECK ROT');
    expect(commits()).toBe(1);
  });
});
