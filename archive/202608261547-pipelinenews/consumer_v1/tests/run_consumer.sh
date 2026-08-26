#!/usr/bin/env bash
set -euo pipefail
python consumer_v1/scripts/build_consumer.py
python consumer_v1/tests/verify_consumer.py
bash newsv1/tests/run_newsv1.sh
