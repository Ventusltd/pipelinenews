#!/usr/bin/env bash
set -euo pipefail

REPOSITORY_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPOSITORY_ROOT"

node --check tooling/build-202608251701-release.mjs
for module_file in discoveryv1/modules/*.mjs attributionv1/modules/*.mjs; do node --check "$module_file"; done

node tooling/build-202608251701-release.mjs
for test_file in \
  discoveryv1/tests/check_batch1_schema.mjs \
  discoveryv1/tests/check_batch2_planner_adapters.mjs \
  discoveryv1/tests/check_batch3_normalize_credibility.mjs \
  discoveryv1/tests/check_batch4_binding.mjs \
  attributionv1/tests/check_batch5_attribution.mjs \
  attributionv1/tests/check_batch6_registers.mjs \
  attributionv1/tests/check_batch7_product.mjs \
  tests/check-202608251701-pipelinenews.mjs; do
  node "$test_file"
done

FIRST_SHA="$(sha256sum releases/202608251701-pipelinenews.json discoveryv1/data/build_manifest.json attributionv1/data/build_manifest.json reports/202608251701-publication-readiness.json)"
node tooling/build-202608251701-release.mjs
SECOND_SHA="$(sha256sum releases/202608251701-pipelinenews.json discoveryv1/data/build_manifest.json attributionv1/data/build_manifest.json reports/202608251701-publication-readiness.json)"
test "$FIRST_SHA" = "$SECOND_SHA"
node tests/check-current-timestamp-release.mjs
