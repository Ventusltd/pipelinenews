#!/usr/bin/env bash
set -euo pipefail

RELEASE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPOSITORY_ROOT="$(cd "$RELEASE_ROOT/.." && pwd)"
cd "$REPOSITORY_ROOT"

for predecessor in newsv1 newsv2 newsv3 newsv4 newsv5 newsv6; do
  bash "$predecessor/tests/run_${predecessor}.sh"
done

node --check newsv7/scripts/build-cumulative-intelligence.mjs
node --check newsv7/scripts/data/canonical-projects-newsv7.js
node --check newsv7/scripts/data/canonical-projects-newsv7-release.js
node --check newsv7/scripts/plugins/intelligence-newsv7.js
node --check newsv7/scripts/plugins/newspaper-newsv7-base.js
node --check newsv7/scripts/plugins/newspaper-newsv7.js
node --check newsv7/scripts/plugins/projects-newsv7.js
node --check newsv7/scripts/app-newsv7.js

node newsv7/scripts/build-cumulative-intelligence.mjs
FIRST_OUTPUT_SHA="$(sha256sum newsv7/data/newsv7/cumulative_intelligence.json newsv7/data/newsv7/build_manifest.json)"
node newsv7/tests/check_newsv7.mjs
node newsv7/scripts/build-cumulative-intelligence.mjs
SECOND_OUTPUT_SHA="$(sha256sum newsv7/data/newsv7/cumulative_intelligence.json newsv7/data/newsv7/build_manifest.json)"
test "$FIRST_OUTPUT_SHA" = "$SECOND_OUTPUT_SHA"
node newsv7/tests/check_newsv7.mjs
