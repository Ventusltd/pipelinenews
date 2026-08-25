#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
node newsv6/scripts/build-data-centre-evidence.mjs
node newsv6/tests/check_newsv6.mjs
bash newsv5/tests/run_newsv5.sh
