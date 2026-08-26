#!/usr/bin/env bash
set -euo pipefail

newsv2_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
node "$newsv2_dir/scripts/build-material-event-ledger.mjs"
node "$newsv2_dir/tests/check_newsv2.mjs"
