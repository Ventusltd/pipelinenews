#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
node analytics_v1/scripts/stage-storage-contract.mjs
node analytics_v1/tests/check-storage-contract.mjs
bash newsv6/tests/run_newsv6.sh
