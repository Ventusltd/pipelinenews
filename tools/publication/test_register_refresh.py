#!/usr/bin/env python3
"""Tests for the quarterly register refresh: register_refresh.py and the
release builder's registry_core door. Synthetic fixtures; no network."""

from __future__ import annotations

import contextlib
import copy
import hashlib
import importlib.util
import io
import json
import os
import tempfile
import unittest
from pathlib import Path


REPO = Path(__file__).resolve().parents[2]


def load(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


release_builder = load("release_builder_core", REPO / "tools" / "intelligence" / "release_builder.py")
refresh = load("register_refresh_core", REPO / "tools" / "intelligence" / "register_refresh.py")

REGISTRY = "data/202608291447-registry.json"
APP = "assets/202608291447-app.mjs"
PARENT = "202601010000-pipelinenews"


def project(ref: str, cap: float, tech: str = "solar", geometry: str = "valid") -> dict:
    return {
        "repd_ref": ref, "gg_project_id": "GG2050-REPD-%s" % ref,
        "gg_development_id": "GG2050-DEV-REPD-%s" % ref,
        "identity_status": "REPD_BOUND", "identity_confidence": "authoritative",
        "name": "Site %s" % ref, "technology": tech, "repd_technology": "Solar Photovoltaics",
        "capacity_mw": cap, "status": "Operational", "lifecycle": "OPERATIONAL",
        "operator": "Op", "county": "Kent", "region": "South East", "country": "England",
        "repd_record_updated": "2026-10-01", "geometry_status": geometry,
        "latitude": 51.0 if geometry == "valid" else None,
        "longitude": 0.5 if geometry == "valid" else None,
        "direct_related_repd_refs": [], "planning_sibling_repd_refs": [],
        "development_repd_refs": [ref],
    }


SPINE = [project("10", 50.0), project("11", 20.0, "bess"), project("12", 12.5),
         project("13", 3.0, "wind_onshore", "missing"), project("14", 1.0)]


class JsOutputTests(unittest.TestCase):
    def test_numbers_print_like_json_stringify(self):
        self.assertEqual(refresh.js_number(4100.0), "4100")
        self.assertEqual(refresh.js_number(12.5), "12.5")
        self.assertEqual(refresh.js_number(56.4431397), "56.4431397")
        self.assertEqual(refresh.js_number(-1.4664021), "-1.4664021")
        self.assertEqual(refresh.js_number(1e-7), "1e-7")
        self.assertEqual(refresh.js_number(0.000001), "0.000001")
        self.assertEqual(refresh.js_number(3), "3")

    def test_stringify_keeps_non_ascii_and_null(self):
        self.assertEqual(refresh.js_stringify({"a": "Ynys Môn", "b": None, "c": [1.0, True]}),
                         '{"a":"Ynys Môn","b":null,"c":[1,true]}')

    def test_normalise_matches_the_compiler_rules(self):
        self.assertEqual(refresh.normalise("Café & Bar / Ltd."), "cafe and bar ltd.")
        self.assertEqual(refresh.normalise(None), "")
        self.assertEqual(refresh.normalise(12.0), "12")

    def test_dictionary_codes_and_search_alignment(self):
        payload = refresh.compile_projects(SPINE, "G", "C")
        self.assertEqual(payload["dictionaries"]["technology"], ["bess", "solar", "wind_onshore"])
        self.assertEqual([r[0] for r in payload["rows"]], ["10", "11", "12", "13", "14"])
        self.assertEqual(payload["rows"][1][3], 0)
        search = refresh.compile_search(SPINE, "G", "C")
        self.assertEqual(len(search["rows"]), len(SPINE))
        self.assertIn("gg2050-repd-12", search["rows"][2])


class ValidateProjectsTests(unittest.TestCase):
    def test_totals(self):
        totals = refresh.validate_projects(SPINE)
        self.assertEqual(totals["project_count"], 5)
        self.assertEqual(totals["capacity_mw"], 86.5)
        self.assertEqual(totals["missing_geometry_count"], 1)

    def test_rejects_duplicate_unsorted_and_sub_megawatt(self):
        for bad in (SPINE + [project("10", 0.5 + 0.5)],
                    [project("1", 2.0), project("2", 3.0)],
                    [project("1", 0.9)]):
            with self.assertRaises(SystemExit):
                refresh.validate_projects(bad)

    def test_rejects_blank_capacity_rather_than_reading_it_as_zero(self):
        p = project("1", 2.0)
        p["capacity_mw"] = None
        with self.assertRaises(SystemExit):
            refresh.validate_projects([p])


class RegistryCoreBuildTests(unittest.TestCase):
    """A synthetic parent release refreshed through cmd_build."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        root = Path(self.tmp.name)
        self.releases, self.cartridges = root / "releases", root / "cartridges"
        self.releases.mkdir()
        self.cartridges.mkdir()
        self.saved = (release_builder.RELEASES, release_builder.CARTRIDGES)
        release_builder.RELEASES, release_builder.CARTRIDGES = str(self.releases), str(self.cartridges)
        self.parent = self.releases / PARENT
        (self.parent / "data" / "projects").mkdir(parents=True)
        (self.parent / "assets").mkdir()
        (self.parent / "index.html").write_text("<title>t</title><span>Q2 cut</span>\n", encoding="utf-8")
        (self.parent / APP).write_text('const X = "Q2";\nasync function boot() {}\n', encoding="utf-8")
        old = [project("1", 5.0)]
        old_part = self.parent / "data" / "projects" / "old-01.json"
        old_part.write_text(json.dumps({"schema": refresh.DETAIL_SCHEMA, "record_count": 1, "projects": old}),
                            encoding="utf-8")
        registry = {
            "detail_schema": refresh.DETAIL_SCHEMA, "detail_partition_size": 2,
            "totals": {"project_count": 1}, "source": {"dataset": "Q2"},
            "cache_identity": "keep", "cache_contract": {"keep": True},
            "assets": {"projects": {"path": "data/old-p.json", "sha256": "x"},
                       "search": {"path": "data/old-s.json", "sha256": "y"},
                       "news": {"path": "data/news.json", "sha256": "z"}},
            "detail_partitions": [{"path": "data/projects/old-01.json"}],
            "supplemental_assets": {},
        }
        (self.parent / REGISTRY).write_text(json.dumps(registry), encoding="utf-8")
        (self.parent / "release-manifest.json").write_text(
            json.dumps({"release_id": PARENT, "parent_release_id": None}), encoding="utf-8")
        self.parent_hashes = self.hash_tree(self.parent)

    def tearDown(self):
        release_builder.RELEASES, release_builder.CARTRIDGES = self.saved
        self.tmp.cleanup()

    @staticmethod
    def hash_tree(root: Path) -> dict:
        return {str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest()
                for p in sorted(root.rglob("*")) if p.is_file()}

    def make_cartridge(self, name="refresh", spine=SPINE, mutate=None):
        pkg = self.cartridges / name
        (pkg / "data").mkdir(parents=True)
        parts = [spine[i:i + 2] for i in range(0, len(spine), 2)]
        detail = []
        for i, rows in enumerate(parts, 1):
            fname = "{GEN}-part-%02d.json" % i
            (pkg / "data" / fname).write_text(json.dumps(
                {"schema": refresh.DETAIL_SCHEMA, "record_count": len(rows), "projects": rows}), encoding="utf-8")
            detail.append({"path": "data/" + fname})
        (pkg / "data" / "{GEN}-projects.json").write_bytes(refresh.json_bytes(
            refresh.compile_projects(spine, "{GEN}", "cid")))
        (pkg / "data" / "{GEN}-search.json").write_bytes(refresh.json_bytes(
            refresh.compile_search(spine, "{GEN}", "cid")))
        totals = refresh.validate_projects(spine)
        man = {
            "key": "repd_test_register", "modifies_existing_dashboard": True,
            "repairs": {"index.html": [{"label": "cut", "from": "Q2 cut", "to": "Q3 cut"}]},
            "registry_core": {
                "totals": totals,
                "source": {"dataset": "Q3", "admitted_project_count": totals["project_count"]},
                "assets.projects": {"path": "data/{GEN}-projects.json", "schema": refresh.PROJECT_SCHEMA,
                                    "generation": "{GEN}", "cache_identity": "cid"},
                "assets.search": {"path": "data/{GEN}-search.json", "schema": refresh.SEARCH_SCHEMA,
                                  "generation": "{GEN}", "cache_identity": "cid"},
                "detail_partitions": detail,
            },
        }
        if mutate:
            mutate(man)
        (pkg / "cartridge.json").write_text(json.dumps(man), encoding="utf-8")
        return name

    def build(self, name, gen="202602020000"):
        with contextlib.redirect_stdout(io.StringIO()):
            return release_builder.cmd_build(PARENT, name, gen, None)

    def test_refresh_derives_digests_and_leaves_parent_untouched(self):
        self.assertEqual(self.build(self.make_cartridge()), 0)
        target = self.releases / "202602020000-pipelinenews"
        reg = json.loads((target / REGISTRY).read_text(encoding="utf-8"))
        self.assertEqual(reg["totals"]["project_count"], 5)
        self.assertEqual(reg["source"]["dataset"], "Q3")
        self.assertEqual([d["record_count"] for d in reg["detail_partitions"]], [2, 2, 1])
        p = target / reg["assets"]["projects"]["path"]
        self.assertEqual(reg["assets"]["projects"]["sha256"], hashlib.sha256(p.read_bytes()).hexdigest())
        self.assertEqual(reg["assets"]["projects"]["generation"], "202602020000")
        self.assertEqual(reg["assets"]["news"], {"path": "data/news.json", "sha256": "z"})
        self.assertEqual(reg["cache_identity"], "keep")
        rel = json.loads((target / "release-manifest.json").read_text(encoding="utf-8"))
        self.assertEqual(sorted(rel["registry_core_replaced"]), sorted(release_builder.REGISTRY_CORE_KEYS))
        self.assertIn("Q3 cut", (target / "index.html").read_text(encoding="utf-8"))
        # inherited Q2 bytes stay, byte-identical
        self.assertTrue((target / "data/projects/old-01.json").exists())
        self.assertEqual(self.hash_tree(self.parent), self.parent_hashes)
        with contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(release_builder.cmd_check("202602020000-pipelinenews"), 0)

    def assert_refused(self, mutate=None, spine=SPINE, index_spine=None):
        name = self.make_cartridge(mutate=mutate, spine=spine)
        if index_spine is not None:
            (self.cartridges / name / "data" / "{GEN}-projects.json").write_bytes(
                refresh.json_bytes(refresh.compile_projects(index_spine, "{GEN}", "cid")))
        with self.assertRaises(SystemExit):
            self.build(name)
        self.assertEqual(self.hash_tree(self.parent), self.parent_hashes)

    def test_refuses_declared_totals_that_disagree(self):
        self.assert_refused(lambda m: m["registry_core"]["totals"].update(project_count=6))

    def test_refuses_partial_core(self):
        self.assert_refused(lambda m: m["registry_core"].pop("assets.search"))

    def test_refuses_keys_outside_the_core(self):
        self.assert_refused(lambda m: m["registry_core"].update(cache_identity="new"))

    def test_refuses_index_out_of_partition_order(self):
        swapped = copy.deepcopy(SPINE)
        swapped[0], swapped[1] = swapped[1], swapped[0]
        self.assert_refused(index_spine=swapped)

    def test_refuses_short_partition_before_the_last(self):
        def short(m):
            m["registry_core"]["detail_partitions"].insert(0, m["registry_core"]["detail_partitions"].pop())
        self.assert_refused(short)

    def test_refuses_path_escaping_release(self):
        self.assert_refused(lambda m: m["registry_core"]["assets.search"].update(path="../x.json"))


guard = load("release_hash_guard_core", REPO / "tools" / "intelligence" / "release_hash_guard.py")


class HashGuardTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        (self.root / "releases" / "a-pipelinenews").mkdir(parents=True)
        (self.root / "releases" / "a-pipelinenews" / "index.html").write_text("a", encoding="utf-8")
        self.snap = str(self.root / "snap.sha256")
        with contextlib.redirect_stdout(io.StringIO()):
            guard.main(["--repo", str(self.root), "--snapshot", self.snap])

    def tearDown(self):
        self.tmp.cleanup()

    def verify(self, *allow):
        args = ["--repo", str(self.root), "--verify", self.snap]
        for name in allow:
            args += ["--allow-new", name]
        with contextlib.redirect_stdout(io.StringIO()):
            return guard.main(args)

    def test_new_release_folder_is_allowed_only_when_named(self):
        new = self.root / "releases" / "b-pipelinenews"
        new.mkdir()
        (new / "index.html").write_text("b", encoding="utf-8")
        self.assertEqual(self.verify("b-pipelinenews"), 0)
        self.assertEqual(self.verify(), 1)

    def test_any_change_to_an_existing_byte_fails(self):
        (self.root / "releases" / "a-pipelinenews" / "index.html").write_text("A", encoding="utf-8")
        self.assertEqual(self.verify(), 1)

    def test_a_deleted_file_fails(self):
        (self.root / "releases" / "a-pipelinenews" / "index.html").unlink()
        self.assertEqual(self.verify(), 1)


@unittest.skipUnless((REPO / "releases" / "202609060232-pipelinenews").is_dir(), "Q2 release not present")
class Q2PortProofTest(unittest.TestCase):
    def test_port_reproduces_shipped_q2_indexes_byte_for_byte(self):
        with contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(refresh.prove_q2("202609060232-pipelinenews"), 0)


if __name__ == "__main__":
    unittest.main()
