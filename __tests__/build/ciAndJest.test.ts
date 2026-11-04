// Nachweise für die Review zu Phase 1, Nr. 9 und Nr. 11 (docs/BEFUNDE.md): Die Lieferkette in CI
// steht fest, und jedes Jest-Projekt prüft nur seinen Ordner. Dazu, seit der Übertragung in mach’s:
// Prüfskript und CI prüfen auch das Händlerportal.
import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const root = path.resolve(__dirname, '..', '..');
const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'check.yml'), 'utf8');

describe('CI mit fester Lieferkette (Nr. 9)', () => {
  test('jede Action steht auf einem Commit-SHA, der Tag als Kommentar dahinter', () => {
    const uses = [...workflow.matchAll(/uses:\s*(\S+)(.*)$/gm)];
    expect(uses.length).toBeGreaterThanOrEqual(2);
    for (const [, ref, rest] of uses) {
      expect([ref, /@[0-9a-f]{40}$/.test(ref!)]).toEqual([ref, true]);
      expect(rest).toMatch(/#\s*v\d/);
    }
  });

  test('gitleaks und osv-scanner mit fester SHA-256, ohne Prüfsummen aus dem Release', () => {
    expect(workflow).toMatch(/GITLEAKS_SHA256:\s*[0-9a-f]{64}\b/);
    expect(workflow).toMatch(/OSV_SCANNER_SHA256:\s*[0-9a-f]{64}\b/);
    expect(workflow).toMatch(/sha256sum --check --strict/);
    expect(workflow).not.toMatch(/checksums?\.txt|SHA256SUMS/i);
  });
});

describe('Jest-Projekte (Nr. 11)', () => {
  type Project = { displayName: string; testMatch?: string[]; testPathIgnorePatterns?: string[] };
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')) as {
    jest: { projects: Project[] };
    scripts: Record<string, string>;
  };
  const project = (name: string) => pkg.jest.projects.find((p) => p.displayName === name)!;

  test('unit prüft nur __tests__/model/, build nur __tests__/build/, ui beide nicht', () => {
    expect(project('unit').testMatch).toEqual(['<rootDir>/__tests__/model/**/*.test.ts']);
    expect(project('build').testMatch).toEqual(['<rootDir>/__tests__/build/**/*.test.ts']);
    expect(project('ui').testPathIgnorePatterns).toEqual(
      expect.arrayContaining(['<rootDir>/__tests__/model/', '<rootDir>/__tests__/build/']),
    );
    expect(pkg.scripts['check:fast']).toContain('--selectProjects unit build');
  });
});

describe('Händlerportal im Prüfskript und in CI', () => {
  /**
   * scripts/ci-checks.sh in einem leeren Ordner. npm, gitleaks und osv-scanner sind Attrappen, die
   * nur ihre Argumente mitschreiben. So zeigt der Test, was das Script aufruft und in welcher Reihenfolge.
   * Mit `failOn` endet genau dieser Aufruf mit Fehler, wie ein roter Typecheck oder Build.
   */
  function run({
    ci,
    portalModules,
    failOn = '',
  }: {
    ci: boolean;
    portalModules: boolean;
    failOn?: string;
  }) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'machs-ci-checks-'));
    try {
      fs.mkdirSync(path.join(dir, 'scripts'));
      fs.mkdirSync(path.join(dir, 'bin'));
      fs.mkdirSync(path.join(dir, 'portal', portalModules ? 'node_modules' : ''), {
        recursive: true,
      });
      fs.copyFileSync(
        path.join(root, 'scripts', 'ci-checks.sh'),
        path.join(dir, 'scripts', 'ci-checks.sh'),
      );
      const log = path.join(dir, 'aufrufe.log');
      for (const name of ['npm', 'gitleaks', 'osv-scanner']) {
        const file = path.join(dir, 'bin', name);
        fs.writeFileSync(
          file,
          `#!/usr/bin/env bash\necho "${name} $*" >> "${log}"\n` +
            `if [ "${name} $*" = "$FAIL_ON" ]; then exit 3; fi\n`,
        );
        fs.chmodSync(file, 0o755);
      }
      const result = spawnSync('bash', [path.join(dir, 'scripts', 'ci-checks.sh')], {
        env: {
          ...process.env,
          PATH: `${path.join(dir, 'bin')}${path.delimiter}${process.env.PATH ?? ''}`,
          CI: ci ? 'true' : '',
          FAIL_ON: failOn,
          BASH_ENV: '',
        },
        encoding: 'utf8',
      });
      const calls = fs.existsSync(log) ? fs.readFileSync(log, 'utf8').trim().split('\n') : [];
      return { status: result.status, stdout: result.stdout, stderr: result.stderr, calls };
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }

  const before = ['npm run check', 'npm run guides:check'];
  const after = [
    'gitleaks git --no-banner --redact .',
    'gitleaks git --no-banner --redact --pre-commit --staged .',
    'gitleaks git --no-banner --redact --pre-commit .',
    'osv-scanner scan source --lockfile package-lock.json --lockfile portal/package-lock.json',
  ];

  test('frischer Klon: erst npm ci im Portal, dann der Typecheck des Portals, kein Build', () => {
    const r = run({ ci: false, portalModules: false });
    expect([r.status, r.stderr]).toEqual([0, '']);
    expect(r.calls).toEqual([
      ...before,
      'npm --prefix portal ci',
      'npm --prefix portal run typecheck',
      ...after,
    ]);
    expect(r.stdout).toContain('Hinweis: next build für das Portal läuft nur in CI.');
  });

  test('mit portal/node_modules: kein zweites npm ci', () => {
    const r = run({ ci: false, portalModules: true });
    expect(r.status).toBe(0);
    expect(r.calls).toEqual([...before, 'npm --prefix portal run typecheck', ...after]);
  });

  test('in CI: npm ci, Typecheck und next build für das Portal', () => {
    const r = run({ ci: true, portalModules: false });
    expect([r.status, r.stderr]).toEqual([0, '']);
    expect(r.calls).toEqual([
      ...before,
      'npm --prefix portal ci',
      'npm --prefix portal run typecheck',
      'npm --prefix portal run build',
      ...after,
    ]);
    expect(r.stdout).not.toContain('Hinweis: next build');
  });

  // Die Garantie des Schritts: Ein roter Schritt im Portal macht das Prüfskript rot, und danach
  // läuft nichts mehr. commit-if-green.sh und CI verlassen sich auf den Exit-Code.
  test.each([
    {
      fall: 'npm ci im Portal scheitert',
      ci: false,
      portalModules: false,
      failOn: 'npm --prefix portal ci',
      calls: ['npm --prefix portal ci'],
    },
    {
      fall: 'der Typecheck des Portals ist rot',
      ci: false,
      portalModules: true,
      failOn: 'npm --prefix portal run typecheck',
      calls: ['npm --prefix portal run typecheck'],
    },
    {
      fall: 'next build in CI ist rot',
      ci: true,
      portalModules: true,
      failOn: 'npm --prefix portal run build',
      calls: ['npm --prefix portal run typecheck', 'npm --prefix portal run build'],
    },
  ])('$fall: das Prüfskript ist rot, gitleaks und osv-scanner laufen nicht mehr', (c) => {
    const r = run(c);
    expect(r.status).not.toBe(0);
    expect(r.status).not.toBeNull();
    expect(r.calls).toEqual([...before, ...c.calls]);
    expect(r.stdout).not.toContain('Alle Prüfungen grün.');
  });

  test('der Typecheck läuft im Ordner portal/ mit dessen tsconfig, nicht über npm exec', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };
    const portal = JSON.parse(
      fs.readFileSync(path.join(root, 'portal', 'package.json'), 'utf8'),
    ) as {
      scripts: Record<string, string>;
    };
    expect(portal.scripts.typecheck).toBe('tsc --noEmit');
    expect(pkg.scripts['check:portal']).toBe('npm --prefix portal run typecheck');
    // npm exec liefe im Wurzelordner. tsc prüfte dort die App, die portal/ ausschließt.
    expect(fs.readFileSync(path.join(root, 'scripts', 'ci-checks.sh'), 'utf8')).not.toMatch(
      /npm --prefix portal exec/,
    );
    // Ein frischer Klon hat kein portal/node_modules. npm run check bleibt darum ohne Portal.
    expect(pkg.scripts.check).not.toMatch(/portal/);
  });

  test('README und ABLAEUFE sagen, was das Prüfskript lokal auslässt', () => {
    // Lokal läuft kein next build, und gitleaks und osv-scanner nur, wenn sie installiert sind.
    // Wer sich vor der Demo auf das Prüfskript verlässt, soll das in beiden Dokumenten lesen.
    for (const doc of ['README.md', path.join('docs', 'ABLAEUFE.md')]) {
      const text = fs.readFileSync(path.join(root, doc), 'utf8');
      expect([doc, text]).toEqual([doc, expect.stringContaining('scripts/ci-checks.sh')]);
      expect([doc, text]).toEqual([doc, expect.stringMatching(/`next build` läuft nur in CI/)]);
      expect([doc, text]).toEqual([
        doc,
        expect.stringMatching(/gitleaks und osv-scanner laufen lokal nur, wenn sie installiert/),
      ]);
    }
  });

  test('der Cache in CI hängt an beiden Lockfiles', () => {
    expect(workflow).toMatch(
      /cache: npm\n\s+(#.*\n\s+)?cache-dependency-path: \|\n\s+package-lock\.json\n\s+portal\/package-lock\.json\n/,
    );
  });
});
