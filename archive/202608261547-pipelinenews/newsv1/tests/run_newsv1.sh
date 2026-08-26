#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

node --check scripts/data/canonical-projects-newsv1.js
node --check scripts/data/canonical-projects-newsv1-release.js
node --check scripts/plugins/newspaper-newsv1-base.js
node --check scripts/plugins/newspaper-newsv1.js
node --check scripts/plugins/projects-newsv1.js
node --check scripts/app-newsv1.js
node tests/check_newsv1.mjs
