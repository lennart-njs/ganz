#!/usr/bin/env bash
# Committet nur, wenn Typecheck, Lint, Prettier und Tests grün sind.
# Aufruf: scripts/commit-if-green.sh "Nachricht"
set -euo pipefail
npm run check >/tmp/ganz-check.log 2>&1 || { tail -40 /tmp/ganz-check.log; echo "CHECK ROT – kein Commit"; exit 1; }
grep -E "Tests:" /tmp/ganz-check.log
git add -A
git commit -q -m "$1"
git log --oneline -1
