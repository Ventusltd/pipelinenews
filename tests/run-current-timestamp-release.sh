#!/usr/bin/env bash
set -euo pipefail

REPOSITORY_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPOSITORY_ROOT"

INPUT="objects/data/sha256/fd0ca49731f5d0e66eaed100f5ce3f1109d4f7975a74f00659e83d76c9cd6308.json"
ENGINE="objects/js/sha256/0f0adf842d22158b882f168d6c131480afd81bce6609b8453a073f15d201d18c.mjs"
ARTIFACT="objects/data/sha256/3918138465d06f1dd94d1e6352154f1e6adc8ebf84a089070c67fc2d7130253b.json"

node --check tooling/build-official-frontier-release.mjs
node --check "$ENGINE"
node --check tooling/poll-official-sources-v2.mjs
node --check tooling/check-repd-source-v2.mjs
node --check tests/check-202608251651-release.mjs
node tooling/build-official-frontier-release.mjs "$INPUT" "$ENGINE" "$ARTIFACT"
FIRST_SHA="$(sha256sum "$ARTIFACT")"
node tests/check-202608251651-release.mjs
node tooling/build-official-frontier-release.mjs "$INPUT" "$ENGINE" "$ARTIFACT"
SECOND_SHA="$(sha256sum "$ARTIFACT")"
test "$FIRST_SHA" = "$SECOND_SHA"
