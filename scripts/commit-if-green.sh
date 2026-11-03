#!/usr/bin/env bash
# Committet nur, wenn scripts/ci-checks.sh grün ist. Dieselben Prüfungen wie in CI.
# Alle Argumente gehen unverändert an git commit. Was in den Commit soll, legst du vorher mit git add fest.
# Aufruf: git add …; scripts/commit-if-green.sh -m "Nachricht"
set -euo pipefail
cd "$(dirname "$0")/.."
log="$(mktemp "${TMPDIR:-/tmp}/ganz-check.XXXXXX")"
if ! scripts/ci-checks.sh >"$log" 2>&1; then
  tail -40 "$log"
  echo "CHECK ROT – kein Commit. Ganzes Protokoll: $log"
  exit 1
fi
grep -E '^Tests:|^Hinweis:' "$log" || true
rm -f "$log"
git commit "$@"
git log --oneline -1
