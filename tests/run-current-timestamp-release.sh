#!/usr/bin/env bash
set -euo pipefail

REPOSITORY_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPOSITORY_ROOT"

node --check tooling/build-202608251929-release.mjs
node --check tooling/templates/202608251929-app.js
node --check tests/check-202608251929-pipelinenews.mjs
node --check tests/browser-live-202608251929.mjs
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  bash tests/check-frozen-release-trees.sh
fi
node tooling/build-202608251929-release.mjs
FIRST_SHA="$(sha256sum releases/202608251929-pipelinenews.json releases/current.json reports/202608251929-pipelinenews-proof.json 202608251929-pipelinenews/index.html 202608251929-pipelinenews/readme.md 202608251929-pipelinenews/release.json)"
node tooling/build-202608251929-release.mjs
SECOND_SHA="$(sha256sum releases/202608251929-pipelinenews.json releases/current.json reports/202608251929-pipelinenews-proof.json 202608251929-pipelinenews/index.html 202608251929-pipelinenews/readme.md 202608251929-pipelinenews/release.json)"
test "$FIRST_SHA" = "$SECOND_SHA"
node tests/check-current-timestamp-release.mjs
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  test -z "$(git status --porcelain=v1 --untracked-files=all)"
fi
