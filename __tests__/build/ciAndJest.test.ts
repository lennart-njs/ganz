// Nachweise für die Review zu Phase 1, Nr. 9 und Nr. 11 (docs/BEFUNDE.md): Die Lieferkette in CI
// steht fest, und jedes Jest-Projekt prüft nur seinen Ordner.
import fs from 'fs';
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
