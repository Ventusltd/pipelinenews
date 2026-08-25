#!/usr/bin/env bash
set -euo pipefail

REPOSITORY_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPOSITORY_ROOT"

INPUT="objects/data/sha256/bee8c8d767323736cc047fec17fd25a94c97374afe9ca3ca8aa446856b640aed.json"
ENGINE="objects/js/sha256/0f0adf842d22158b882f168d6c131480afd81bce6609b8453a073f15d201d18c.mjs"
ARTIFACT="objects/data/sha256/6b33735ff6020881fd92b646dec4d839001ac8af9fb5dc68fac059a1b4758f51.json"

node --check tooling/build-official-frontier-release.mjs
node --check "$ENGINE"
node --check tooling/poll-official-sources.mjs
node --check tooling/check-repd-source.mjs
node --check tests/check-202608251636-release.mjs
node tooling/build-official-frontier-release.mjs "$INPUT" "$ENGINE" "$ARTIFACT"
FIRST_SHA="$(sha256sum "$ARTIFACT")"
node tests/check-202608251636-release.mjs
node tooling/build-official-frontier-release.mjs "$INPUT" "$ENGINE" "$ARTIFACT"
SECOND_SHA="$(sha256sum "$ARTIFACT")"
test "$FIRST_SHA" = "$SECOND_SHA"
