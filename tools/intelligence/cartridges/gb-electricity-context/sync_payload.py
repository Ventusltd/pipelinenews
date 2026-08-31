"""Pin the browser-sized GB price rollup owned by data-gb-electricity.

This copies an already-derived product. It does not read the Parquet, call an
API, recompute a price, or create a competing definition. The PipelineNews
release builder later hashes the exact snapshot into its registry.
"""

import argparse
import io
import json
import os
import shutil


HERE = os.path.dirname(os.path.abspath(__file__))
DEST = os.path.join(HERE, "data", "{GEN}-price-decade-rollup.json")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True,
                        help="data-gb-electricity/derived/price-decade-rollup.json")
    args = parser.parse_args()

    with io.open(args.source, encoding="utf-8") as handle:
        product = json.load(handle)
    if product.get("schema") != "data-gb-electricity.price-decade-rollup.v1":
        raise SystemExit("wrong GB electricity product schema")
    price = product.get("price") or {}
    years = price.get("by_year") or []
    if len(years) < 10:
        raise SystemExit("price rollup does not cover a decade")
    if sum(int(row["days"]) for row in years) != product["derived_from"]["complete_days"]:
        raise SystemExit("yearly complete-day total disagrees with provenance")
    if sum(int(row["days_with_a_negative_settlement_period"]) for row in years) \
            != price["days_with_a_negative_settlement_period"]:
        raise SystemExit("yearly negative-settlement-day total disagrees with headline")
    if product.get("solar", {}).get("present") is not False:
        raise SystemExit("snapshot unexpectedly claims a solar series")

    os.makedirs(os.path.dirname(DEST), exist_ok=True)
    shutil.copyfile(args.source, DEST)
    print("pinned %s complete days across %d calendar years" %
          (product["derived_from"]["complete_days"], len(years)))
    print("wrote %s" % DEST)


if __name__ == "__main__":
    main()
