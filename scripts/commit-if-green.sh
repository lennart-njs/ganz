#!/usr/bin/env bash
# Committet nur, wenn scripts/ci-checks.sh grün ist. Dieselben Prüfungen wie in CI.
# Alle Argumente gehen unverändert an git commit. Was in den Commit soll, legst du vorher mit git add fest.
# Die Prüfungen laufen auf dem Arbeitsbaum. Damit sie genau für den Commit gelten, bricht das
# Script ab, solange etwas nicht bereitliegt: geänderte Dateien ohne git add oder neue Dateien.
# Sonst könnte ein Commit rot sein, obwohl hier alles grün war.
# Aufruf: git add …; scripts/commit-if-green.sh -m "Nachricht"
set -euo pipefail
cd "$(dirname "$0")/.."
if ! git diff --quiet || [ -n "$(git ls-files --others --exclude-standard)" ]; then
  echo "Abbruch: Nicht alles liegt bereit. Die Prüfung gälte sonst nicht für den Commit." >&2
  git status --short >&2
  echo "Erst git add oder die Änderungen beiseitelegen (git stash -u), dann noch einmal." >&2
  exit 1
fi
if git diff --cached --quiet; then
  echo "Abbruch: Mit git add liegt nichts bereit." >&2
  exit 1
fi
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
