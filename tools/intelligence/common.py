"""Shared helpers for the VERIFIERS suite.

Pure stdlib. No network. No third-party imports. Read-only: nothing in here
writes to any repository. Every verifier imports from this module so that a
path change is made once.
"""

import io
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
BUILD_PLAN = os.path.dirname(HERE)
GRIDATLAS = os.path.dirname(BUILD_PLAN)
GITHUB = os.path.dirname(GRIDATLAS)

EVIDENCE = os.path.join(BUILD_PLAN, "PROJECT-STUDIES", "_evidence")
FIXTURES = os.path.join(HERE, "fixtures")

MANIFEST = os.path.join(
    GITHUB, "pipelinenews", "data", "manifests",
    "202608261927-build-manifest-v9-1.json")

# The AUTHORITATIVE source: 16 partition files, 480-500 records each.
# Verifiers read these, never a derived artefact, so that a defect in the
# extraction chain shows up as a difference rather than being baked in.
PARTITION_DIR = os.path.join(GITHUB, "pipelinenews", "data", "projects")
PARTITION_GLOB = "202608261927-project-partition-v9-1-*.json"

# Derived artefacts, verified AGAINST the authoritative source above.
RECORDS = os.path.join(EVIDENCE, "records-clean.txt")
SPINE = os.path.join(EVIDENCE, "spine-v3.tsv")
GRIDATLAS_REFS = os.path.join(EVIDENCE, "gridatlas-refs.txt")

# Keys the partition envelope carries around the record array. The last
# record on each line of the derived records-clean.txt is followed by these,
# which is why a strict json.loads on that file fails on exactly 16 lines.
PARTITION_ENVELOPE_KEYS = ("record_count", "release", "schema", "partition")

# Spine TSV column order, as emitted by the extraction chain.
SPINE_COLS = [
    "repd_ref", "capacity_mw", "technology", "status", "lifecycle", "name",
    "operator", "lpa", "county", "region", "country", "lon", "lat",
    "geometry_status", "submitted", "granted", "refused", "expected_op",
    "under_construction", "operational", "withdrawn",
]


class Result(object):
    """Accumulates PASS/FAIL checks for one verifier."""

    def __init__(self, verifier, title):
        self.verifier = verifier
        self.title = title
        self.checks = []

    def check(self, name, ok, expected=None, actual=None, detail=None):
        self.checks.append({
            "name": name, "ok": bool(ok),
            "expected": expected, "actual": actual, "detail": detail,
        })
        return bool(ok)

    def equals(self, name, expected, actual, detail=None):
        return self.check(name, expected == actual, expected, actual, detail)

    @property
    def failed(self):
        return [c for c in self.checks if not c["ok"]]

    @property
    def ok(self):
        return not self.failed

    def report(self):
        head = "%s  %s" % (self.verifier, self.title)
        print(head)
        print("-" * max(len(head), 64))
        for c in self.checks:
            mark = "PASS" if c["ok"] else "FAIL"
            line = "  [%s] %s" % (mark, c["name"])
            if not c["ok"] or c["expected"] is not None:
                line += "\n         expected: %r\n         actual:   %r" % (
                    c["expected"], c["actual"])
            if c["detail"]:
                line += "\n         %s" % c["detail"]
            print(line)
        print("  %d checks, %d failed\n" % (len(self.checks), len(self.failed)))
        return 0 if self.ok else 1


def require(path, what):
    if not os.path.exists(path):
        sys.stderr.write("MISSING %s: %s\n" % (what, path))
        sys.exit(2)
    return path


def load_manifest():
    with io.open(require(MANIFEST, "build manifest"), encoding="utf-8") as fh:
        return json.load(fh)


def load_partitions():
    """Parse the 16 authoritative partition files.

    Returns (records, partitions) where partitions carries each file's
    declared record_count, so the envelope can be checked against its contents.
    """
    import glob
    paths = sorted(glob.glob(os.path.join(PARTITION_DIR, PARTITION_GLOB)))
    if not paths:
        sys.stderr.write("MISSING partitions: %s\n"
                         % os.path.join(PARTITION_DIR, PARTITION_GLOB))
        sys.exit(2)
    records, partitions = [], []
    for path in paths:
        with io.open(path, encoding="utf-8") as fh:
            doc = json.load(fh)
        rows = doc.get("projects") or []
        records.extend(rows)
        partitions.append({
            "file": os.path.basename(path),
            "declared": doc.get("record_count"),
            "actual": len(rows),
            "release": doc.get("release"),
            "schema": doc.get("schema"),
        })
    return records, partitions


def load_records():
    """Records from the derived records-clean.txt, one per line.

    Uses raw_decode rather than json.loads: the last record on each partition
    is followed by the partition envelope (record_count / release / schema),
    which is trailing content, not a truncated record. Returns
    (records, bad_lines, trailers) so a caller can assert that the only
    trailing content is the expected envelope and that there are exactly as
    many trailers as partitions.
    """
    decoder = json.JSONDecoder()
    records, bad, trailers = [], [], []
    with io.open(require(RECORDS, "clean records"), encoding="utf-8") as fh:
        for n, line in enumerate(fh, 1):
            line = line.strip()
            if not line:
                continue
            try:
                obj, end = decoder.raw_decode(line)
            except ValueError as exc:
                bad.append((n, str(exc), line[:80]))
                continue
            records.append(obj)
            rest = line[end:].strip()
            if rest:
                trailers.append((n, rest))
    return records, bad, trailers


def load_spine():
    rows = []
    with io.open(require(SPINE, "spine tsv"), encoding="utf-8") as fh:
        for line in fh:
            line = line.rstrip("\n")
            if not line:
                continue
            rows.append(line.split("\t"))
    return rows


def load_fixture(name):
    path = require(os.path.join(FIXTURES, name), "fixture")
    with io.open(path, encoding="utf-8") as fh:
        return json.load(fh)
