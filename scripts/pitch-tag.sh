#!/usr/bin/env bash
# Setzt den lokalen Tag pitch-JJJJ-Wxx (ISO-Woche) auf HEAD. Kein Push.
# Vorher die Prüfungen auf dem Pitch-Telefon aus docs/PITCH_CHECK.md durchgehen und eintragen.
#
# Bricht ab,
#   - wenn der Arbeitsbaum Änderungen hat. Die Prüfung gälte sonst nicht für HEAD.
#   - solange ein Befund offen ist, der eine feste Regel bricht (R-07, R-12, R-13, R-16, R-17),
#     siehe scripts/open-findings.js,
#   - wenn es den Tag dieser Woche schon auf einem anderen Commit gibt,
#   - wenn scripts/ci-checks.sh rot ist.
# Aufruf: scripts/pitch-tag.sh
set -euo pipefail
cd "$(dirname "$0")/.."

tag="pitch-$(date +%G-W%V)"
echo "Pitch-Tag $tag. Die Prüfungen aus docs/PITCH_CHECK.md müssen für diesen Commit eingetragen sein."

if [ -n "$(git status --porcelain)" ]; then
  echo "Abbruch: Der Arbeitsbaum hat Änderungen. Erst committen oder aufräumen." >&2
  git status --short >&2
  exit 1
fi

if ! node scripts/open-findings.js; then
  echo "Abbruch: Solange ein regelbrechender Befund offen ist, gibt es keinen Pitch-Tag." >&2
  exit 1
fi

head="$(git rev-parse HEAD)"
existing="$(git rev-parse -q --verify "refs/tags/$tag^{commit}" || true)"
if [ -n "$existing" ] && [ "$existing" != "$head" ]; then
  echo "Abbruch: $tag steht schon auf $(git log --oneline -1 "$existing")." >&2
  echo "Zum Verschieben erst löschen: git tag -d $tag" >&2
  exit 1
fi

if ! scripts/ci-checks.sh; then
  echo "Abbruch: Die Prüfungen sind rot. Kein Pitch-Tag." >&2
  exit 1
fi

if [ "$existing" = "$head" ]; then
  echo "$tag steht schon auf HEAD."
  exit 0
fi

git tag -a "$tag" -m "Pitch-Stand $(date +%G) KW $(date +%V)" \
  -m "Nach grünem scripts/ci-checks.sh, ohne offenen regelbrechenden Befund. Prüfungen auf dem Telefon: docs/PITCH_CHECK.md."
echo "Tag gesetzt: $tag auf $(git log --oneline -1)"
echo "Der Tag ist nur lokal."
