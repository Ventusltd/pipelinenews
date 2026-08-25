#!/usr/bin/env bash
set -euo pipefail

REPOSITORY_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPOSITORY_ROOT"

INPUT="objects/data/sha256/fd90d5e386ab94b1d94113e78364a4dcfd2d3842beee8f5e3b1771f0b242d977.json"
ENGINE="objects/js/sha256/d7c0164d2d767996c45e86d27c4754d4388e4493a00a33e2429c6759cfe9b328.mjs"
ARTIFACT="objects/data/sha256/3d2cd9cba8581bbc8c4e7434deb0c584d3969639a00926393cf011e2c3f8a00b.json"

node --check tooling/build-evidence-release.mjs
node --check "$ENGINE"
node --check tests/check-202608251622-release.mjs
node tooling/build-evidence-release.mjs "$INPUT" "$ENGINE"
FIRST_SHA="$(sha256sum "$ARTIFACT")"
node tests/check-202608251622-release.mjs
node tooling/build-evidence-release.mjs "$INPUT" "$ENGINE"
SECOND_SHA="$(sha256sum "$ARTIFACT")"
test "$FIRST_SHA" = "$SECOND_SHA"
