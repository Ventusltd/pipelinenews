#!/usr/bin/env bash
set -euo pipefail

REPOSITORY_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPOSITORY_ROOT"

node --check tooling/build-current-discovery-release.mjs
node --check tests/check-current-timestamp-release.mjs
node tooling/build-current-discovery-release.mjs
FIRST_SHA="$(sha256sum objects/data/sha256/865a45f79688a2d5774f87a5c2001ac01a54204af74ba4ef8dab125798f1830c.json)"
node tests/check-current-timestamp-release.mjs
node tooling/build-current-discovery-release.mjs
SECOND_SHA="$(sha256sum objects/data/sha256/865a45f79688a2d5774f87a5c2001ac01a54204af74ba4ef8dab125798f1830c.json)"
test "$FIRST_SHA" = "$SECOND_SHA"
