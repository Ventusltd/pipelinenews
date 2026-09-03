"""verify_widen.py - prove the widened payload changed nothing it should not have.

WHY THIS EXISTS

Adding rows to the spine and re-running the engine is only safe if the rows that were
already there come out identical. If they do not, the adapter has perturbed a published
measurement, and every solar and bess distance in the product silently moved.

That is easy to get wrong in a way no eyeball catches. build_payload.py builds a spatial
index over the segments and sweeps outward from each site; a denser or differently ordered
row set could in principle change which candidate a search settles on. This asserts it did
not, per row and per field, rather than trusting that it could not.

Three checks, in the order that makes a failure legible:

  1. REPRODUCTION - re-running the ORIGINAL spine through today's engine must reproduce
     the published file. If this fails, the published file was built by a different engine
     or from a different spine, and no comparison after it means anything. Comparing the
     widened output against a stale published file instead of against a fresh baseline is
     how a real regression gets attributed to drift and waved through.

  2. INVARIANCE - every ref present in the baseline must appear in the widened payload
     with byte-identical JSON. Not "close", not "within tolerance": identical. A distance
     that moves by 1e-9 still means the search changed, and the next change might not be
     1e-9.

  3. COVERAGE - the new rows must actually carry measurements, not nulls. A row added to
     the file that reports nothing is worse than an absent row, because absence is honest
     and a null in a populated column reads as "measured, nothing near".

Usage:
    python verify_widen.py --baseline <baseline.json> --widened <widened.json>
                           [--published <shipped grid-proximity.json>]
"""

import argparse
import collections
import json


def rows_of(path):
    d = json.load(open(path, encoding="utf-8"))
    rs = d if isinstance(d, list) else next(
        v for v in d.values() if isinstance(v, list) and v and isinstance(v[0], dict))
    return d, {r["ref"]: r for r in rs}, rs


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--baseline", required=True)
    ap.add_argument("--widened", required=True)
    ap.add_argument("--published")
    a = ap.parse_args()

    _, base, base_rows = rows_of(a.baseline)
    _, wide, wide_rows = rows_of(a.widened)
    fail = 0

    if a.published:
        _, pub, pub_rows = rows_of(a.published)
        same = sum(1 for k in pub
                   if k in base and json.dumps(pub[k], sort_keys=True)
                   == json.dumps(base[k], sort_keys=True))
        print(f"1. REPRODUCTION  published {len(pub)} rows | baseline {len(base)} rows | "
              f"identical {same}")
        if same != len(pub) or len(pub) != len(base):
            fail += 1
            print("   FAIL - today's engine does not reproduce the published file.")
            for k in list(pub)[:400]:
                if k in base and json.dumps(pub[k], sort_keys=True) != json.dumps(
                        base[k], sort_keys=True):
                    for f in pub[k]:
                        if json.dumps(pub[k].get(f), sort_keys=True) != json.dumps(
                                base[k].get(f), sort_keys=True):
                            print(f"   first diff ref {k}.{f}: "
                                  f"{pub[k].get(f)!r} -> {base[k].get(f)!r}")
                            break
                    break
        else:
            print("   ok - the engine reproduces what is shipped, so the comparison below "
                  "is engine-vs-engine")

    missing = [k for k in base if k not in wide]
    moved = [k for k in base
             if k in wide and json.dumps(base[k], sort_keys=True)
             != json.dumps(wide[k], sort_keys=True)]
    print(f"\n2. INVARIANCE    baseline rows {len(base)} | present in widened "
          f"{len(base)-len(missing)} | moved {len(moved)}")
    if missing or moved:
        fail += 1
        print(f"   FAIL - {len(missing)} dropped, {len(moved)} changed")
        for k in moved[:5]:
            for f in base[k]:
                if json.dumps(base[k].get(f), sort_keys=True) != json.dumps(
                        wide[k].get(f), sort_keys=True):
                    print(f"   ref {k}.{f}: {base[k].get(f)!r} -> {wide[k].get(f)!r}")
                    break
    else:
        print("   ok - every previously published row is byte-identical")

    new = [wide[k] for k in wide if k not in base]
    with_circuit = [r for r in new if r.get("circuit")]
    with_sub = [r for r in new if r.get("substation")]
    print(f"\n3. COVERAGE      new rows {len(new)} | with a circuit "
          f"{len(with_circuit)} | with a substation {len(with_sub)}")
    tech = collections.Counter(r.get("tech") for r in new)
    print("   new tech:", tech.most_common())
    if new and len(with_circuit) < len(new):
        print(f"   note: {len(new)-len(with_circuit)} new row(s) matched no circuit at all")
    if not new:
        fail += 1
        print("   FAIL - nothing was added")
    elif len(with_circuit) < 0.95 * len(new):
        fail += 1
        print("   FAIL - most new rows carry no measurement; a populated column of nulls "
              "reads as 'measured, nothing near', which is a different claim from 'absent'")

    allrows = collections.Counter(r.get("tech") for r in wide_rows)
    print(f"\n   widened total {len(wide_rows)} rows: {allrows.most_common()}")
    print("\n" + ("VERDICT: PASS" if not fail else f"VERDICT: FAIL ({fail} check(s))"))
    return 1 if fail else 0


if __name__ == "__main__":
    raise SystemExit(main())
