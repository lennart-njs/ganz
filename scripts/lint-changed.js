#!/usr/bin/env node
// ESLint nur auf geänderten Dateien, für npm run check:fast (Stop-Hook der Sitzungen).
// Geändert heißt: gegenüber HEAD (oder dem ersten Argument, z. B. origin/main) und neue,
// noch nicht eingecheckte Dateien. Gelöschte Dateien fallen weg.
// Aufruf: node scripts/lint-changed.js [basis]
const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LINTABLE = /\.(js|jsx|ts|tsx|cjs|mjs)$/;
const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const base = process.argv[2] ?? 'HEAD';

function git(args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' })
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

const changed = [
  ...git(['diff', '--name-only', '--diff-filter=ACMR', base]),
  ...git(['ls-files', '--others', '--exclude-standard']),
];
const files = [...new Set(changed)]
  .filter((file) => LINTABLE.test(file))
  .filter((file) => fs.existsSync(path.join(root, file)));

if (files.length === 0) {
  console.log('Lint: keine geänderten Dateien.');
  process.exit(0);
}

console.log(`Lint: ${files.length} geänderte Datei(en).`);
// Direkt über node, ohne Shell: Pfade wie app/fall/[id]/index.tsx bleiben unverändert.
const eslintPackage = require.resolve('eslint/package.json', { paths: [root] });
const eslint = path.join(path.dirname(eslintPackage), 'bin', 'eslint.js');
const args = [eslint, '--max-warnings', '10', '--no-warn-ignored', '--', ...files];
const result = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit' });
process.exit(result.status ?? 1);
