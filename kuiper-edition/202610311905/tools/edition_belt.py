#!/usr/bin/env python3
"""edition_belt.py: place the verified keyed findings of a Kuiper edition on the belt.

Law (kuiper-belt/README.md, estate-network.json "law"): one body per key;
r = a_min + (a_max - a_min) * sqrt((k + 0.5) / n), k the body ordinal among sorted keys;
theta = k * 2.399963229728653 (the golden angle in radians, turning the way estate.py turns);
class is a property and never a position; no edges, because an unmeasured edge would be a claim
without a key.

Input : register.tsv  (worker, finding, repo, commit, path, line_start, line_end, title, pattern, verified)
Output: belt/belt.json  {name, source, law, counts, stations:[[x,y,id,open,...]]} in the wafer contract
        belt/bodies.json one record per body, key beside the human fields
        belt/rules.txt   every constant used
        proof/<run-id>-belt.json  SHA-256 of every output, counts, the exact command line

The key of a body is the git blob SHA of the file at the commit, joined with the line number:
"<blob-sha>:<line>". It is resolved with `git rev-parse <commit>:<path>` in the local clone named
by --roots. A finding whose blob cannot be resolved is not placed; it is counted as `unresolved`.
"""
import argparse, csv, hashlib, json, math, os, subprocess, sys, datetime

GOLDEN_ANGLE_RAD = 2.399963229728653   # 137.507764 deg; estate.py turns +137.5 per body
A_MIN, A_MAX = 0.08, 0.48              # the drawable annulus in the unit square, centre (0.5, 0.5)

def sh(cmd, cwd=None):
    return subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)

def blob_sha(roots, repo, commit, path):
    for root in roots:
        clone = os.path.join(root, repo)
        if os.path.isdir(os.path.join(clone, ".git")):
            r = sh(["git", "-C", clone, "rev-parse", "--verify", "-q", f"{commit}:{path}"])
            if r.returncode == 0:
                return r.stdout.strip(), clone
            return None, clone
    return None, None

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--register", required=True)
    ap.add_argument("--roots", required=True, help="comma separated clone roots")
    ap.add_argument("--out", required=True, help="edition folder")
    ap.add_argument("--run-id", required=True)
    ap.add_argument("--asof", default=None)
    args = ap.parse_args()
    asof = args.asof or datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")
    roots = args.roots.split(",")
    rows = list(csv.DictReader(open(args.register, newline=""), delimiter="\t"))
    bodies, unresolved, skipped = [], [], 0
    for row in rows:
        if row.get("verified", "").strip().upper() not in ("CONFIRMED", "VERIFIED", "PASS"):
            skipped += 1
            continue
        repo, commit, path = row["repo"].strip(), row["commit"].strip(), row["path"].strip()
        try:
            line = int(str(row["line_start"]).strip())
        except ValueError:
            unresolved.append({**row, "reason": "line not an integer"}); continue
        b, clone = blob_sha(roots, repo, commit, path)
        if not b:
            unresolved.append({**row, "reason": "blob not resolvable in clone" if clone else "clone not found"}); continue
        key = f"{b}:{line}"
        bodies.append({
            "id": key, "blob": b, "line": line, "repo": repo, "commit": commit, "path": path,
            "line_end": row.get("line_end", "").strip() or str(line),
            "title": row.get("title", "").strip(), "pattern": row.get("pattern", "").strip(),
            "worker": row.get("worker", "").strip(), "finding": row.get("finding", "").strip(),
            "quote": row.get("quote", "").strip()[:160],
            "class": row.get("cls", "").strip() or ("focus" if repo in ("gridatlas", "data-grid-gb", "data-centres-gb") else "estate"),
            "destination": f"https://github.com/Ventusltd/{repo}/blob/{commit}/{path}#L{line}",
            "open": True,
        })
    # one body per key: a line cited twice is one body
    seen, uniq = set(), []
    for b in bodies:
        if b["id"] in seen: continue
        seen.add(b["id"]); uniq.append(b)
    uniq.sort(key=lambda b: b["id"])
    n = len(uniq)
    stations = []
    for k, b in enumerate(uniq):
        r = A_MIN + (A_MAX - A_MIN) * math.sqrt((k + 0.5) / n)
        th = k * GOLDEN_ANGLE_RAD
        x, y = round(0.5 + r * math.cos(th), 6), round(0.5 + r * math.sin(th), 6)
        b["k"], b["x"], b["y"], b["r"], b["theta"] = k, x, y, round(r, 6), round(th % (2 * math.pi), 6)
        stations.append({"id": b["id"], "x": x, "y": y, "m": 1, "class": b["class"], "open": True})
    belt = {
        "name": f"kuiper-edition-{args.run_id}",
        "source": "verified keyed findings of the swarm; key = git blob SHA of the file at the cited commit, joined with the line",
        "attribution": "content identifiers issued by git; quotes are the estate's own lines",
        "law": "one body per key; r = a_min + (a_max - a_min) * sqrt((k + 0.5) / n) with k the body ordinal among sorted keys; theta = k * 2.399963229728653; class is a property and never a position; no edges, because an unmeasured edge would be a claim without a key",
        "asof": asof,
        "counts": {"register_rows": len(rows), "not_verified_skipped": skipped, "unresolved": len(unresolved), "bodies": n,
                   "dim": 0, "focus": sum(1 for b in uniq if b["class"] == "focus")},
        "stations": stations, "edges": [],
    }
    os.makedirs(os.path.join(args.out, "belt"), exist_ok=True)
    os.makedirs(os.path.join(args.out, "proof"), exist_ok=True)
    outs = {}
    def write(rel, text):
        p = os.path.join(args.out, rel); open(p, "w").write(text); outs[rel] = hashlib.sha256(text.encode()).hexdigest()
    write("belt/belt.json", json.dumps(belt, separators=(",", ":")))
    write("belt/bodies.json", json.dumps(uniq, indent=0))
    write("belt/unresolved.json", json.dumps(unresolved, indent=1))
    git = sh(["git", "--version"]).stdout.strip()
    write("belt/rules.txt", "\n".join([
        f"asof {asof}", f"run-id {args.run_id}", f"a_min {A_MIN}", f"a_max {A_MAX}",
        f"theta_per_body_rad {GOLDEN_ANGLE_RAD}", "radius_law sqrt((k+0.5)/n) scaled to the annulus",
        "order sorted key, key = <blob sha>:<line>", "edges none (unmeasured)", f"n {n}", f"git {git}",
        "command " + " ".join(sys.argv), ""]))
    proof = {"run_id": args.run_id, "asof": asof, "sha256": outs, "counts": belt["counts"], "command": " ".join(sys.argv)}
    open(os.path.join(args.out, "proof", f"{args.run_id}-belt.json"), "w").write(json.dumps(proof, indent=1))
    print(json.dumps(belt["counts"]))
    print(json.dumps(outs, indent=1))

if __name__ == "__main__":
    main()
