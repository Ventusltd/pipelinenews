#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
python3 analytics_v1/scripts/build_parquet.py
python3 analytics_v1/tests/verify_parquet.py
bash newsv6/tests/run_newsv6.sh
