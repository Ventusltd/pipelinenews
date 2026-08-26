#!/usr/bin/env bash
set -euo pipefail

newsv4_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
node "$newsv4_dir/scripts/build-source-health-context.mjs"
node "$newsv4_dir/tests/check_newsv4.mjs"
bash "$newsv4_dir/../newsv3/tests/run_newsv3.sh"
