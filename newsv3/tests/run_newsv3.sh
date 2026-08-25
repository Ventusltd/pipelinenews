#!/usr/bin/env bash
set -euo pipefail

newsv3_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
node "$newsv3_dir/scripts/build-organisation-role-evidence.mjs"
node "$newsv3_dir/tests/check_newsv3.mjs"
bash "$newsv3_dir/../newsv2/tests/run_newsv2.sh"
