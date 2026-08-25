#!/usr/bin/env bash
set -euo pipefail

newsv5_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
node "$newsv5_dir/scripts/build-reason-decisions.mjs"
node "$newsv5_dir/tests/check_newsv5.mjs"
bash "$newsv5_dir/../newsv4/tests/run_newsv4.sh"
