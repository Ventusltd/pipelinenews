#!/usr/bin/env bash
set -euo pipefail

REPOSITORY_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPOSITORY_ROOT"

INPUT="objects/data/sha256/b7f1740f7735f58997c8f128ef7236d57bb144fd5db23c8140739236af8bdabb.json"
ENGINE="objects/js/sha256/bf8b87533cda64fa145de9ca28998b29bf7f863f483a26a78e34fc3272fe9f7d.mjs"
ARTIFACT="objects/data/sha256/b518e2c02a4059a8c07f226f9c0f284215acc4fc0f9f5790ce8ec19e49a5755d.json"

node --check tooling/build-official-frontier-release.mjs
node --check "$ENGINE"
node --check tooling/poll-official-sources-v2.mjs
node --check tooling/check-repd-source-v2.mjs
node --check tests/check-202608251700-pipelinenews.mjs
node tooling/build-official-frontier-release.mjs "$INPUT" "$ENGINE" "$ARTIFACT"
FIRST_SHA="$(sha256sum "$ARTIFACT")"
node tests/check-202608251700-pipelinenews.mjs
node tooling/build-official-frontier-release.mjs "$INPUT" "$ENGINE" "$ARTIFACT"
SECOND_SHA="$(sha256sum "$ARTIFACT")"
test "$FIRST_SHA" = "$SECOND_SHA"
