#!/usr/bin/env bash
# Eine Quelle für alle Prüfungen. Es rufen auf: .github/workflows/check.yml,
# scripts/commit-if-green.sh und scripts/pitch-tag.sh.
#
#   1. npm run check         Typecheck, Lint, Prettier, alle Tests
#   2. npm run guides:check  Anleitungen wörtlich wie in der Demo
#   3. gitleaks              Geheimnisse im Verlauf und in den Änderungen
#   4. osv-scanner           bekannte Schwachstellen in package-lock.json, Ausnahmen in osv-scanner.toml
#
# Lokal laufen 3 und 4 nur, wenn die Programme installiert sind. Sonst kommt ein Hinweis.
# In CI (CI=true) muss es beide geben, sonst ist die Prüfung rot.
# Aufruf: scripts/ci-checks.sh
set -euo pipefail
cd "$(dirname "$0")/.."

section() { printf '\n== %s ==\n' "$1"; }

missing() {
  if [ "${CI:-}" = "true" ]; then
    echo "FEHLT: $1. In CI lädt .github/workflows/check.yml es vorher." >&2
    exit 1
  fi
  echo "Hinweis: $1 ist nicht installiert. Die Prüfung fehlt lokal, in CI läuft sie immer."
  echo "Hinweis: Installation siehe $2"
}

section 'npm run check'
npm run check

section 'npm run guides:check'
npm run guides:check

section 'gitleaks'
if command -v gitleaks >/dev/null 2>&1; then
  # Der ganze Verlauf, dann was bereitliegt (git add), dann was noch nicht bereitliegt.
  gitleaks git --no-banner --redact .
  gitleaks git --no-banner --redact --pre-commit --staged .
  gitleaks git --no-banner --redact --pre-commit .
else
  missing gitleaks https://github.com/gitleaks/gitleaks#installing
fi

section 'osv-scanner'
if command -v osv-scanner >/dev/null 2>&1; then
  osv-scanner scan source --lockfile package-lock.json
else
  missing osv-scanner https://google.github.io/osv-scanner/installation/
fi

printf '\nAlle Prüfungen grün.\n'
