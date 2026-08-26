#!/usr/bin/env bash
set -euo pipefail

REPOSITORY_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPOSITORY_ROOT"

node --check tooling/finalise-202608260159-release.mjs
node --check tooling/sanitise-202608260159-news.mjs
node --check tests/check-202608260159-pipelinenews.mjs
node --check tests/browser-202608260159-pipelinenews.mjs
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  bash tests/check-frozen-release-trees.sh
fi
node tooling/finalise-202608260159-release.mjs
FIRST_SHA="$(sha256sum releases/202608260159-pipelinenews.json releases/candidate.json reports/202608260159-pipelinenews-proof.json reports/202608260159-pipelinenews-substitutions.json 202608260159-pipelinenews/index.html 202608260159-pipelinenews/readme.md 202608260159-pipelinenews/release.json)"
node tooling/finalise-202608260159-release.mjs
SECOND_SHA="$(sha256sum releases/202608260159-pipelinenews.json releases/candidate.json reports/202608260159-pipelinenews-proof.json reports/202608260159-pipelinenews-substitutions.json 202608260159-pipelinenews/index.html 202608260159-pipelinenews/readme.md 202608260159-pipelinenews/release.json)"
test "$FIRST_SHA" = "$SECOND_SHA"
node tests/check-current-timestamp-release.mjs
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  test -z "$(git status --porcelain=v1 --untracked-files=all)"
fi
