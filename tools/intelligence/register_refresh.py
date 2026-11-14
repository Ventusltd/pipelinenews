"""Make a register-refresh cartridge: a new quarterly REPD cut for Pipeline News.

WHY THIS IS A CARTRIDGE
-----------------------
release_builder.py makes every release as `--from <parent> --cartridge <name>`.
A new REPD quarter is the same act: take the newest working app, keep every
panel it has, and replace the one thing that came from the register -- the
v9.1 project spine (detail partitions) and the two compact indexes compiled
from it. Nothing already published is touched; the new files carry the new
generation in their names and the parent release stays byte-for-byte.

THE CHAIN, AND WHERE EACH STEP ALREADY LIVED
--------------------------------------------
  1. identity     globalgrid2050 scripts/build_project_identity_v6.py
                  -> project_identity (schema globalgrid2050.project-identity.v6)
  2. coordinates  globalgrid2050 uk_renewables_pipeline/v9/scripts/data/
                  build_v7_2_spine.py::build_coordinate_fixture(xlsx, identity)
  3. spine        globalgrid2050 .../build_v9_1_spine.py, run UNCHANGED with its
                  contract and output redirected (it writes into
                  uk_renewables_pipeline/v9/data/v9.1 by fixed path otherwise)
  4. indexes      index/202608270055-compile-v8-fast.mjs compileProjects() and
                  searchText(), ported here line for line. The port is proven
                  by --prove-q2: it recompiles the Q2 partitions shipped in
                  data/projects/ and must reproduce the shipped
                  202608270055-8ab1807551bc-v8-fast-{projects,search}.json
                  byte for byte.
  5. cartridge    cartridges/repd-<label>-register/cartridge.json + data/*, with
                  a `registry_core` block that release_builder.py applies.

Steps 1 and 2 are inputs (--identity, --coordinates). Step 3 needs a
globalgrid2050 checkout (--gg2050) for the spine builder and is redirected into
--work. Nothing here writes into either repository except the cartridge
directory named by --cartridge-out.

    python register_refresh.py --prove-q2
    python register_refresh.py --label 2026q3 \
        --dataset "DESNZ Renewable Energy Planning Database Q3 2026" \
        --identity project_identity_2026q3.json \
        --coordinates repd_2026q3_coordinates.json \
        --gg2050 ../globalgrid2050 --work /tmp/refresh \
        --parent 202609060232-pipelinenews \
        --expect-projects 7775 --expect-capacity-mw 365474.49

Stdlib only. No network.
"""

import argparse
import hashlib
import importlib
import io
import json
import math
import os
import re
import sys
import unicodedata
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
RELEASES = os.path.join(REPO, "releases")
CARTRIDGES = os.path.join(HERE, "cartridges")
APP = "assets/202608291447-app.mjs"
REGISTRY = "data/202608291447-registry.json"

PROJECT_SCHEMA = "pipelinenews.v8.fast-project-index.v1"
SEARCH_SCHEMA = "pipelinenews.v8.fast-search-index.v1"
DETAIL_SCHEMA = "globalgrid2050.v9.project-partition.v9.1"
PROJECT_FIELDS = ["repd_ref", "gg_project_id", "name", "technology", "status",
                  "capacity_mw", "county", "region", "operator",
                  "repd_record_updated", "geometry_status", "latitude",
                  "longitude"]
DICTIONARY_FIELDS = ["technology", "status", "county", "region", "operator",
                     "geometry_status"]
TECHNOLOGIES = ("solar", "bess", "wind_onshore", "wind_offshore")

Q2_PROJECTS = "data/202608270055-8ab1807551bc-v8-fast-projects.json"
Q2_SEARCH = "data/202608270055-8ab1807551bc-v8-fast-search.json"
Q2_PROJECTS_SHA = "c06aedef176d2d38fd135806306a8ef81b4af9994c7be31e8bd760304149f862"
Q2_SEARCH_SHA = "a1cbfc5202b717889a471409e850ea5cae13626f91c60f08cda0b06da5102b65"
Q2_CACHE_IDENTITY = "8ab1807551bc77066e46e01cb0690dfaa41d473d8433644046f56b6984579b06"
Q2_GENERATION = "202608270055"


# ------------------------------------------------------------------ helpers

def sha256_bytes(raw):
    return hashlib.sha256(raw).hexdigest()


def sha256_file(path):
    with open(path, "rb") as fh:
        return sha256_bytes(fh.read())


def read(path):
    with io.open(path, encoding="utf-8", newline="") as fh:
        return fh.read()


def write_bytes(path, raw):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as fh:
        fh.write(raw)


# ----------------------------------------------- JavaScript-identical output
# JSON.stringify(value) + "\n" is what the Node compiler wrote. Python's json
# differs only in numbers: JS prints an integral double without ".0" and uses
# exponent form outside [1e-7, 1e21). Strings: neither escapes non-ASCII.

def js_number(value):
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, int):
        return str(value)
    if not math.isfinite(value):
        return "null"
    if value == int(value) and abs(value) < 1e21:
        return str(int(value))
    text = repr(value)
    if "e" in text:
        mantissa, exponent = text.split("e")
        exponent = int(exponent)
        if -7 < exponent < 21:
            return format(value, "f").rstrip("0").rstrip(".")
        return "%se%s%d" % (mantissa, "+" if exponent > 0 else "-", abs(exponent))
    return text


def js_stringify(value):
    if value is None:
        return "null"
    if isinstance(value, (bool, int, float)):
        return js_number(value)
    if isinstance(value, str):
        return json.dumps(value, ensure_ascii=False)
    if isinstance(value, (list, tuple)):
        return "[" + ",".join(js_stringify(v) for v in value) + "]"
    if isinstance(value, dict):
        return "{" + ",".join(json.dumps(str(k), ensure_ascii=False) + ":" + js_stringify(v)
                              for k, v in value.items()) + "}"
    raise TypeError("cannot stringify %r" % type(value))


def json_bytes(value):
    return (js_stringify(value) + "\n").encode("utf-8")


def js_string(value):
    """String(value ?? "") for the values a spine record holds."""
    if value is None:
        return ""
    if isinstance(value, (list, tuple)):
        return ",".join(js_string(v) for v in value)
    if isinstance(value, (bool, int, float)):
        return js_number(value)
    return str(value)


# ------------------------------------- port of compile-v8-fast.mjs (Q2-proven)

_COMBINING = re.compile("[̀-ͯ]")


def normalise(value):
    text = unicodedata.normalize("NFKD", js_string(value))
    text = _COMBINING.sub("", text).lower()
    text = text.replace("&", " and ")
    text = re.sub(r"[^a-z0-9.-]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def search_text(project):
    refs = []
    for key in ("direct_related_repd_refs", "planning_sibling_repd_refs", "development_repd_refs"):
        if isinstance(project.get(key), list):
            refs.extend(project[key])
    return normalise(" ".join(js_string(project.get(k)) for k in (
        "name", "operator", "repd_ref", "gg_project_id", "gg_development_id",
        "repd_old_ref", "repd_technology", "technology", "status", "lifecycle",
        "capacity_mw", "county", "region", "country", "planning_authority",
        "planning_application_reference", "repd_record_updated",
        "geometry_status")) + " " + " ".join(js_string(r) for r in refs))


def _js_sort_key(value):
    # Array.prototype.sort() default: compare by UTF-16 code units.
    return value.encode("utf-16-be")


def compile_projects(projects, generation, cache_identity):
    dictionaries, lookup = {}, {}
    for field in DICTIONARY_FIELDS:
        values = sorted({p.get(field) if p.get(field) is not None else "" for p in projects},
                        key=_js_sort_key)
        dictionaries[field] = values
        lookup[field] = {v: i for i, v in enumerate(values)}

    def code(field, project):
        value = project.get(field)
        return lookup[field][value if value is not None else ""]

    rows = [[p["repd_ref"], p["gg_project_id"], p["name"], code("technology", p),
             code("status", p), p["capacity_mw"], code("county", p), code("region", p),
             code("operator", p), p["repd_record_updated"], code("geometry_status", p),
             p["latitude"], p["longitude"]] for p in projects]
    return {"schema": PROJECT_SCHEMA, "generation": generation,
            "cache_identity": cache_identity, "fields": PROJECT_FIELDS,
            "dictionaries": dictionaries, "rows": rows}


def compile_search(projects, generation, cache_identity):
    return {"schema": SEARCH_SCHEMA, "generation": generation,
            "cache_identity": cache_identity,
            "row_alignment": "global_project_row_index",
            "rows": [search_text(p) for p in projects]}


def validate_projects(projects):
    """The compiler's validateProjects(), minus the Q2 constants."""
    refs, previous = set(), float("inf")
    counts = Counter()
    capacity, largest, geometry = 0.0, 0.0, 0
    for p in projects:
        ref = p.get("repd_ref")
        if not (isinstance(ref, str) and ref):
            raise SystemExit("spine record without repd_ref")
        if p.get("gg_project_id") != "GG2050-REPD-%s" % ref:
            raise SystemExit("gg_project_id does not bind REPD %s" % ref)
        if p.get("identity_status") != "REPD_BOUND" or p.get("identity_confidence") != "authoritative":
            raise SystemExit("REPD %s is not an authoritative REPD-bound identity" % ref)
        if p.get("technology") not in TECHNOLOGIES:
            raise SystemExit("REPD %s technology %r outside the spine" % (ref, p.get("technology")))
        cap = p.get("capacity_mw")
        if not (isinstance(cap, (int, float)) and math.isfinite(cap) and cap >= 1):
            raise SystemExit("REPD %s capacity %r is not a known value >= 1 MW" % (ref, cap))
        if ref in refs:
            raise SystemExit("duplicate REPD Ref %s" % ref)
        if cap > previous:
            raise SystemExit("canonical project order is no longer capacity-descending")
        previous = cap
        refs.add(ref)
        counts[p["technology"]] += 1
        capacity += cap
        largest = max(largest, cap)
        geometry += p.get("geometry_status") == "valid"
    return {
        "project_count": len(projects),
        "capacity_mw": round(capacity + sys.float_info.epsilon, 2),
        "largest_mw": largest,
        "solar_count": counts["solar"],
        "bess_count": counts["bess"],
        "wind_onshore_count": counts["wind_onshore"],
        "wind_offshore_count": counts["wind_offshore"],
        "geometry_count": geometry,
        "missing_geometry_count": len(projects) - geometry,
    }


def load_partitions(paths):
    projects = []
    for path in paths:
        payload = json.loads(read(path))
        if payload.get("schema") != DETAIL_SCHEMA:
            raise SystemExit("%s is not a v9.1 project partition" % path)
        if payload["record_count"] != len(payload["projects"]):
            raise SystemExit("%s record_count disagrees with its rows" % path)
        projects.extend(payload["projects"])
    return projects


# ---------------------------------------------------------------- --prove-q2

def prove_q2(release):
    """Recompile the shipped Q2 indexes from the shipped Q2 partitions."""
    root = os.path.join(RELEASES, release)
    reg = json.loads(read(os.path.join(root, REGISTRY)))
    paths = [os.path.join(root, d["path"]) for d in reg["detail_partitions"]]
    projects = load_partitions(paths)
    totals = validate_projects(projects)
    ok = True
    for label, payload, rel, want in (
            ("projects", compile_projects(projects, Q2_GENERATION, Q2_CACHE_IDENTITY), Q2_PROJECTS, Q2_PROJECTS_SHA),
            ("search", compile_search(projects, Q2_GENERATION, Q2_CACHE_IDENTITY), Q2_SEARCH, Q2_SEARCH_SHA)):
        got = sha256_bytes(json_bytes(payload))
        shipped = sha256_file(os.path.join(root, rel))
        good = got == want == shipped
        ok &= good
        print("  [%s] %-8s recompiled %s  shipped %s" % ("PASS" if good else "FAIL", label, got[:16], shipped[:16]))
    good = {k: totals[k] for k in reg["totals"]} == reg["totals"]
    ok &= good
    print("  [%s] totals   %s" % ("PASS" if good else "FAIL", totals))
    return 0 if ok else 1


# ------------------------------------------------------------------- spine

def build_spine(gg2050, work, label, dataset, identity, coordinates, expected):
    """Run globalgrid2050's build_v9_1_spine.main() unchanged, redirected."""
    scripts = os.path.join(gg2050, "uk_renewables_pipeline", "v9", "scripts", "data")
    if not os.path.exists(os.path.join(scripts, "build_v9_1_spine.py")):
        raise SystemExit("no build_v9_1_spine.py under %s" % scripts)
    sys.dont_write_bytecode = True
    sys.path.insert(0, scripts)
    spine = importlib.import_module("build_v9_1_spine")
    from pathlib import Path

    coord_doc = json.loads(read(coordinates))
    contract = {
        "schema": "globalgrid2050.uk-renewables.release.v9.1",
        "release": "9.1",
        "feature": "quarterly-register-refresh-%s" % label,
        "source": {
            "dataset": dataset,
            "identity_fixture": os.path.abspath(identity),
            "identity_fixture_sha256": sha256_file(identity),
            "coordinate_fixture": os.path.abspath(coordinates),
            "coordinate_fixture_sha256": sha256_file(coordinates),
            "workbook_sha256": coord_doc["source_workbook_sha256"],
        },
        "scope": {
            "capacity_mw_inclusive_minimum": 1.0,
            "technologies": list(TECHNOLOGIES),
            "all_official_statuses": True,
            "record_identity_preserved": True,
            "development_deduplication_forbidden": True,
        },
        "expected": expected,
    }
    os.makedirs(work, exist_ok=True)
    contract_path = os.path.join(work, "release.v9.1.%s.json" % label)
    with io.open(contract_path, "w", encoding="utf-8") as fh:
        fh.write(json.dumps(contract, indent=2) + "\n")
    out = os.path.join(work, "v9.1")
    spine.CONTRACT_PATH = Path(contract_path)
    spine.OUTPUT_DIR = Path(out)
    # ROOT / <absolute path> resolves to the absolute path, so the fixture
    # paths in the contract above are used as given.
    spine.main()
    manifest = json.loads(read(os.path.join(out, "build_manifest.json")))
    return out, manifest, contract_path


# --------------------------------------------------------------- grid notes

def grid_coverage(parent_root, projects):
    """Recount the 'Not measured' sentence for this cut from the shipped payload."""
    path = os.path.join(parent_root, "data", "202608311800-grid-distance.json")
    grid = json.loads(read(path)).get("grid") or {}
    total = len(projects)
    measured = sum(1 for p in projects if p["repd_ref"] in grid)
    unmeasured = total - measured
    located_unmeasured = sum(1 for p in projects
                             if p["repd_ref"] not in grid and p["geometry_status"] == "valid")
    missing = sum(1 for p in projects if p["geometry_status"] == "missing")
    invalid = sum(1 for p in projects if p["geometry_status"] == "invalid")
    return {"total": total, "measured": measured, "unmeasured": unmeasured,
            "located_unmeasured": located_unmeasured, "missing": missing,
            "invalid": invalid}


def fmt(n):
    return "{:,}".format(n)


# ------------------------------------------------------------------- main

def make_cartridge(a):
    parent_root = os.path.join(RELEASES, a.parent)
    if not os.path.isdir(parent_root):
        raise SystemExit("no such parent release: %s" % a.parent)

    identity_doc = json.loads(read(a.identity))
    if identity_doc.get("schema") != "globalgrid2050.project-identity.v6":
        raise SystemExit("identity is not globalgrid2050.project-identity.v6")
    expected = {
        "project_count": a.expect_projects,
        "capacity_mw": a.expect_capacity_mw,
        "largest_mw": a.expect_largest_mw,
        "solar_count": a.expect_solar,
        "bess_count": a.expect_bess,
        "wind_onshore_count": a.expect_wind_onshore,
        "wind_offshore_count": a.expect_wind_offshore,
    }
    spine_dir, manifest, contract_path = build_spine(
        a.gg2050, a.work, a.label, a.dataset, a.identity, a.coordinates, expected)

    part_paths = [os.path.join(spine_dir, "projects", os.path.basename(p["path"]))
                  for p in manifest["project_partitions"]]
    projects = load_partitions(part_paths)
    totals = validate_projects(projects)
    for key in expected:
        if totals[key] != expected[key]:
            raise SystemExit("spine %s=%r, expected %r" % (key, totals[key], expected[key]))

    out = a.cartridge_out or os.path.join(CARTRIDGES, "repd-%s-register" % a.label)
    if os.path.exists(out) and os.listdir(out):
        raise SystemExit("cartridge directory already populated: %s" % out)
    data_dir = os.path.join(out, "data")

    # The compact indexes carry a cache identity of their own: the digest of
    # what they were compiled from, so a stale cache can never answer for them.
    cache_contract = {
        "schema": "pipelinenews.register-refresh-cache-contract.v1",
        "label": a.label,
        "compiler": "tools/intelligence/register_refresh.py (port of index/202608270055-compile-v8-fast.mjs)",
        "spine_manifest_sha256": sha256_file(os.path.join(spine_dir, "build_manifest.json")),
        "projects_sha256": manifest["projects_sha256"],
        "project_fields": PROJECT_FIELDS,
        "dictionary_fields": DICTIONARY_FIELDS,
    }
    cache_identity = sha256_bytes(json.dumps(cache_contract, sort_keys=True).encode("utf-8"))
    prefix = cache_identity[:12]

    detail = []
    for index, path in enumerate(part_paths, 1):
        name = "{GEN}-repd-%s-project-partition-%02d.json" % (a.label, index)
        with open(path, "rb") as fh:
            raw = fh.read()
        if b"{GEN}" in raw:
            raise SystemExit("partition %s contains the {GEN} placeholder" % path)
        write_bytes(os.path.join(data_dir, name), raw)
        detail.append({"path": "data/" + name, "activation": "project-detail-or-export"})

    projects_name = "{GEN}-%s-repd-%s-fast-projects.json" % (prefix, a.label)
    search_name = "{GEN}-%s-repd-%s-fast-search.json" % (prefix, a.label)
    write_bytes(os.path.join(data_dir, projects_name),
                json_bytes(compile_projects(projects, "{GEN}", cache_identity)))
    write_bytes(os.path.join(data_dir, search_name),
                json_bytes(compile_search(projects, "{GEN}", cache_identity)))

    # ---- the visible sentences that name the cut ---------------------------
    idx = read(os.path.join(parent_root, "index.html"))
    app = read(os.path.join(parent_root, APP))
    q2_line = "<span>Canonical DESNZ REPD Q2 2026: 7,680 solar, BESS and wind records at ≥1 MW.</span>"
    if idx.count(q2_line) != 1:
        raise SystemExit("index.html no longer carries the Q2 cut sentence exactly once")
    new_line = ("<span>Canonical %s: %s solar, BESS and wind records at ≥1 MW. "
                "Grid distance, locality, project-intelligence and wider-fleet panels are carried "
                "from the Q2 2026 cut and join by REPD Ref ID.</span>"
                % (a.short_label, fmt(totals["project_count"])))

    cov = grid_coverage(parent_root, projects)
    old_measured = ("\"Not measured. 3,047 of the 7,680 records in this cut carry a grid measurement "
                    "and 4,633 do not. This project has a register coordinate and is one of the "
                    "4,605 unmeasured records that do: no search was run for it, so none failed.\"")
    new_measured = ("\"Not measured. %s of the %s records in this cut carry a grid measurement "
                    "(carried from the Q2 2026 cut) and %s do not. This project has a register "
                    "coordinate and is one of the %s unmeasured records that do: no search was run "
                    "for it, so none failed.\"" % (fmt(cov["measured"]), fmt(cov["total"]),
                                                     fmt(cov["unmeasured"]), fmt(cov["located_unmeasured"])))
    old_missing = ("\"Not measurable. The register publishes no usable coordinate for this project, "
                   "so there is no point on the ground to measure from. 28 of the 7,680 records are "
                   "in that state, 26 missing and 2 invalid. The record stays searchable and exportable.\"")
    new_missing = ("\"Not measurable. The register publishes no usable coordinate for this project, "
                   "so there is no point on the ground to measure from. %s of the %s records are "
                   "in that state, %s missing and %s invalid. The record stays searchable and exportable.\""
                   % (fmt(cov["missing"] + cov["invalid"]), fmt(cov["total"]), fmt(cov["missing"]),
                      fmt(cov["invalid"])))
    old_ids = "\"14657/14657 canonical REPD Ref IDs\""
    new_ids = "`${registry.source.source_record_count}/${registry.source.source_record_count} canonical REPD Ref IDs`"
    for needle in (old_measured, old_missing, old_ids):
        if app.count(needle) != 1:
            raise SystemExit("app.mjs anchor not found exactly once: %s" % needle[:60])

    registry_core = {
        "totals": totals,
        "source": {
            "dataset": a.dataset,
            "source_record_count": identity_doc["raw_record_count"],
            "projects_sha256": manifest["projects_sha256"],
            "identity_sha256": manifest["source_identity_sha256"],
            "coordinate_fixture_sha256": manifest["source_coordinate_fixture_sha256"],
            "workbook_sha256": manifest["source_workbook_sha256"],
            "admitted_project_count": totals["project_count"],
            "candidate_delta": ({"count": a.candidate_delta, "status": "held-fail-closed",
                                 "rule": a.candidate_delta_rule}
                                if a.candidate_delta is not None
                                else {"count": None, "status": "not-assessed-for-this-cut"}),
            "source_csv_sha256": (identity_doc.get("source_hashes") or {}).get("csv_sha256"),
            "source_xlsx_sha256": (identity_doc.get("source_hashes") or {}).get("xlsx_sha256"),
            "previous_cut": "DESNZ Renewable Energy Planning Database Q2 2026 (7,680 projects, 14,657 source records)",
        },
        "assets.projects": {"path": "data/" + projects_name, "schema": PROJECT_SCHEMA,
                            "activation": "boot", "generation": "{GEN}",
                            "cache_identity": cache_identity},
        "assets.search": {"path": "data/" + search_name, "schema": SEARCH_SCHEMA,
                          "activation": "first-nonempty-search", "generation": "{GEN}",
                          "cache_identity": cache_identity},
        "detail_partitions": detail,
    }
    cartridge = {
        "key": "repd_%s_register" % a.label,
        "summary": ("Quarterly register refresh: the project spine, compact index and search index "
                    "move from %s to %s (%s projects at >=1 MW from %s source records; was 7,680 "
                    "from 14,657). Every other panel is carried from the parent unchanged and joins "
                    "by REPD Ref ID." % ("REPD Q2 2026", a.short_label, fmt(totals["project_count"]),
                                         fmt(identity_doc["raw_record_count"]))),
        "modifies_existing_dashboard": True,
        "modification_note": ("Replaces registry totals, source, assets.projects, assets.search and "
                              "detail_partitions through release_builder's registry_core block; the "
                              "Q2 files stay in the release as inherited, unreferenced bytes so the "
                              "parent's digests remain true. Three sentences that named Q2 counts are "
                              "re-counted for this cut."),
        "repairs": {
            "index.html": [{"label": "the cut sentence names %s" % a.short_label,
                            "from": q2_line, "to": new_line}],
            "app": [
                {"label": "not-measured sentence recounted for this cut", "from": old_measured, "to": new_measured},
                {"label": "not-measurable sentence recounted for this cut", "from": old_missing, "to": new_missing},
                {"label": "CSV export reads the record count from the registry", "from": old_ids, "to": new_ids},
            ],
        },
        "registry_core": registry_core,
        "provenance": {
            "label": a.label,
            "parent_release": a.parent,
            "spine_contract_sha256": sha256_file(contract_path),
            "spine_manifest_sha256": cache_contract["spine_manifest_sha256"],
            "identity": {"name": os.path.basename(a.identity), "sha256": sha256_file(a.identity)},
            "coordinates": {"name": os.path.basename(a.coordinates), "sha256": sha256_file(a.coordinates)},
            "grid_coverage": cov,
        },
    }
    with io.open(os.path.join(out, "cartridge.json"), "w", encoding="utf-8", newline="") as fh:
        fh.write(json.dumps(cartridge, indent=2, ensure_ascii=False) + "\n")
    print("cartridge %s" % out)
    print("  projects %d  capacity %.2f MW  partitions %d  geometry %d" % (
        totals["project_count"], totals["capacity_mw"], len(detail), totals["geometry_count"]))
    print("  grid coverage %s" % cov)
    return 0


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--prove-q2", nargs="?", const="202609060232-pipelinenews", metavar="RELEASE")
    ap.add_argument("--label")
    ap.add_argument("--short-label", help='e.g. "DESNZ REPD Q3 2026"')
    ap.add_argument("--dataset")
    ap.add_argument("--identity")
    ap.add_argument("--coordinates")
    ap.add_argument("--gg2050")
    ap.add_argument("--work")
    ap.add_argument("--parent")
    ap.add_argument("--cartridge-out")
    ap.add_argument("--candidate-delta", type=int,
                    help="records a different capacity rounding would admit, held out (as Q2's 23)")
    ap.add_argument("--candidate-delta-rule", default="admitted at >=1 MW only under the CSV's rounded capacity; "
                    "the spine uses official XLSX precision")
    ap.add_argument("--expect-projects", type=int)
    ap.add_argument("--expect-capacity-mw", type=float)
    ap.add_argument("--expect-largest-mw", type=float)
    ap.add_argument("--expect-solar", type=int)
    ap.add_argument("--expect-bess", type=int)
    ap.add_argument("--expect-wind-onshore", type=int)
    ap.add_argument("--expect-wind-offshore", type=int)
    a = ap.parse_args()
    if a.prove_q2:
        return prove_q2(a.prove_q2)
    need = ["label", "short_label", "dataset", "identity", "coordinates", "gg2050", "work", "parent",
            "expect_projects", "expect_capacity_mw", "expect_largest_mw", "expect_solar",
            "expect_bess", "expect_wind_onshore", "expect_wind_offshore"]
    missing = [n for n in need if getattr(a, n) in (None, "")]
    if missing:
        ap.error("missing: " + ", ".join("--" + m.replace("_", "-") for m in missing))
    return make_cartridge(a)


if __name__ == "__main__":
    sys.exit(main())
