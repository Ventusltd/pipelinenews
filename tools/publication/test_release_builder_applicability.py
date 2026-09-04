#!/usr/bin/env python3
"""Regression tests for release-builder cartridge applicability."""

from __future__ import annotations

import contextlib
import importlib.util
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest import mock


REPO = Path(__file__).resolve().parents[2]
BUILDER_PATH = REPO / "tools" / "intelligence" / "release_builder.py"
SPEC = importlib.util.spec_from_file_location("release_builder_applicability", BUILDER_PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError(f"cannot import {BUILDER_PATH}")
release_builder = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(release_builder)

REGISTRY = Path("data") / "202608291447-registry.json"
LEGACY_ROOT = "202608291447-pipelinenews"
LEGACY_ROOT_SCHEMA = "pipelinenews.timestamp-folder-successor.v1"
OMIT = object()


class ApplicabilityFixture(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.releases = self.root / "releases"
        self.cartridges = self.root / "cartridges"
        self.releases.mkdir()
        self.cartridges.mkdir()
        self.original_releases = release_builder.RELEASES
        self.original_cartridges = release_builder.CARTRIDGES
        release_builder.RELEASES = str(self.releases)
        release_builder.CARTRIDGES = str(self.cartridges)

    def tearDown(self) -> None:
        release_builder.RELEASES = self.original_releases
        release_builder.CARTRIDGES = self.original_cartridges
        self.temporary.cleanup()

    def add_release(
        self,
        release_id: str,
        *,
        parent: object = OMIT,
        schema: str = "pipelinenews.additive-cartridge-release.v1",
        cartridge_added: str | None = None,
        assets: tuple[str, ...] = (),
    ) -> Path:
        target = self.releases / release_id
        (target / REGISTRY.parent).mkdir(parents=True)
        manifest: dict[str, object] = {
            "release_id": release_id,
            "schema": schema,
        }
        if parent is not OMIT:
            manifest["parent_release_id"] = parent
        if cartridge_added is not None:
            manifest["cartridge_added"] = cartridge_added
        (target / "release-manifest.json").write_text(
            json.dumps(manifest), encoding="utf-8"
        )
        (target / REGISTRY).write_text(
            json.dumps({"supplemental_assets": {key: {} for key in assets}}),
            encoding="utf-8",
        )
        return target

    def add_root(self, *, parent: object = OMIT) -> Path:
        return self.add_release(
            LEGACY_ROOT,
            parent=parent,
            schema=LEGACY_ROOT_SCHEMA,
        )

    def add_cartridge(self, directory: str, key: str) -> None:
        target = self.cartridges / directory
        target.mkdir()
        (target / "cartridge.json").write_text(
            json.dumps({"key": key, "summary": "test cartridge"}),
            encoding="utf-8",
        )

    def test_registered_asset_is_applied(self) -> None:
        release_id = LEGACY_ROOT
        self.add_release(
            release_id, schema=LEGACY_ROOT_SCHEMA, assets=("registered_asset",)
        )
        self.assertEqual(
            release_builder.cartridge_keys(release_id), {"registered_asset"}
        )

    def test_repair_only_key_is_inherited_from_ancestor_manifest(self) -> None:
        base = "202609040001-pipelinenews"
        tip = "202609040002-pipelinenews"
        self.add_root()
        self.add_release(
            base,
            parent=LEGACY_ROOT,
            cartridge_added="repair_only",
            assets=("ancestor_asset",),
        )
        self.add_release(tip, parent=base, assets=("registered_asset",))
        self.assertEqual(
            release_builder.cartridge_keys(tip),
            {"registered_asset", "ancestor_asset", "repair_only"},
        )

    def test_idempotent_payload_repair_is_not_reapplied(self) -> None:
        base = "202609040001-pipelinenews"
        tip = "202609040002-pipelinenews"
        self.add_root()
        self.add_release(
            base, parent=LEGACY_ROOT, cartridge_added="wider_fleet_proximity"
        )
        self.add_release(tip, parent=base, assets=("grid_proximity",))
        self.add_cartridge("wider-fleet-proximity", "wider_fleet_proximity")

        output = io.StringIO()
        with mock.patch.object(release_builder, "cmd_build") as build:
            with contextlib.redirect_stdout(output):
                result = release_builder.cmd_applicable(tip)

        self.assertEqual(result, 0)
        build.assert_not_called()
        self.assertRegex(output.getvalue(), r"wider-fleet-proximity\s+ALREADY APPLIED")

    def test_unapplied_repair_is_probed(self) -> None:
        tip = "202609040001-pipelinenews"
        self.add_root()
        self.add_release(tip, parent=LEGACY_ROOT)
        self.add_cartridge("new-repair", "new_repair")

        output = io.StringIO()
        with mock.patch.object(release_builder, "utc_stamp", return_value="202609040002"):
            with mock.patch.object(release_builder, "cmd_build") as build:
                with contextlib.redirect_stdout(output):
                    result = release_builder.cmd_applicable(tip)

        self.assertEqual(result, 0)
        build.assert_called_once_with(tip, "new-repair", "202609040002", None)
        self.assertIn("new-repair                   APPLIES", output.getvalue())

    def test_missing_parent_fails_closed_before_probe(self) -> None:
        tip = "202609040002-pipelinenews"
        self.add_release(tip, parent="202609040001-pipelinenews")
        self.add_cartridge("new-repair", "new_repair")

        with mock.patch.object(release_builder, "cmd_build") as build:
            with self.assertRaisesRegex(SystemExit, "missing release.*202609040001"):
                release_builder.cmd_applicable(tip)
        build.assert_not_called()

    def test_missing_registry_fails_closed(self) -> None:
        tip = LEGACY_ROOT
        target = self.add_root()
        (target / REGISTRY).unlink()
        with self.assertRaisesRegex(SystemExit, "missing registry"):
            release_builder.cartridge_keys(tip)

    def test_malformed_manifest_fails_closed(self) -> None:
        tip = LEGACY_ROOT
        target = self.add_root()
        (target / "release-manifest.json").write_text("{", encoding="utf-8")
        with self.assertRaisesRegex(SystemExit, "malformed release manifest"):
            release_builder.cartridge_keys(tip)

    def test_malformed_registry_fails_closed(self) -> None:
        tip = LEGACY_ROOT
        target = self.add_root()
        (target / REGISTRY).write_text(
            json.dumps({"supplemental_assets": []}), encoding="utf-8"
        )
        with self.assertRaisesRegex(SystemExit, "malformed supplemental_assets"):
            release_builder.cartridge_keys(tip)

    def test_malformed_parent_id_fails_closed(self) -> None:
        tip = "202609040001-pipelinenews"
        self.add_release(tip, parent="../outside")
        with self.assertRaisesRegex(SystemExit, "malformed parent_release_id"):
            release_builder.cartridge_keys(tip)

    def test_cycle_fails_closed(self) -> None:
        first = "202609040002-pipelinenews"
        second = "202609040001-pipelinenews"
        self.add_release(first, parent=second)
        self.add_release(second, parent=first)
        with self.assertRaisesRegex(SystemExit, "cycle.*202609040001"):
            release_builder.cartridge_keys(first)

    def test_only_legacy_root_may_omit_or_null_parent(self) -> None:
        root = self.add_root(parent=None)
        self.assertEqual(release_builder.cartridge_keys(LEGACY_ROOT), set())

        manifest_path = root / "release-manifest.json"
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        del manifest["parent_release_id"]
        manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
        self.assertEqual(release_builder.cartridge_keys(LEGACY_ROOT), set())

    def test_omitted_or_null_intermediate_parent_fails_closed(self) -> None:
        tip = "202609040002-pipelinenews"
        intermediate = "202609040001-pipelinenews"
        self.add_root()
        intermediate_dir = self.add_release(intermediate, parent=None)
        self.add_release(tip, parent=intermediate)

        with self.assertRaisesRegex(SystemExit, "null parent_release_id"):
            release_builder.cartridge_keys(tip)

        manifest_path = intermediate_dir / "release-manifest.json"
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        del manifest["parent_release_id"]
        manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
        with self.assertRaisesRegex(SystemExit, "missing parent_release_id"):
            release_builder.cartridge_keys(tip)

    def test_legacy_root_requires_schema_marker(self) -> None:
        self.add_release(LEGACY_ROOT, parent=None, schema="wrong.root.schema")
        with self.assertRaisesRegex(SystemExit, "only legacy root.*successor"):
            release_builder.cartridge_keys(LEGACY_ROOT)

    def test_forward_or_equal_parent_generation_fails_closed(self) -> None:
        current = "202609040002-pipelinenews"
        forward = "202609040003-pipelinenews"
        self.add_release(current, parent=forward)
        self.add_release(forward, parent=LEGACY_ROOT)
        with self.assertRaisesRegex(SystemExit, "not strictly older"):
            release_builder.cartridge_keys(current)

        current_manifest = self.releases / current / "release-manifest.json"
        manifest = json.loads(current_manifest.read_text(encoding="utf-8"))
        manifest["parent_release_id"] = current
        current_manifest.write_text(json.dumps(manifest), encoding="utf-8")
        with self.assertRaisesRegex(SystemExit, "not strictly older"):
            release_builder.cartridge_keys(current)

    def test_supplemental_entries_must_be_objects(self) -> None:
        root = self.add_root()
        registry_path = root / REGISTRY
        for malformed in (None, [], "asset"):
            with self.subTest(value=malformed):
                registry_path.write_text(
                    json.dumps({"supplemental_assets": {"bad": malformed}}),
                    encoding="utf-8",
                )
                with self.assertRaisesRegex(
                    SystemExit, "malformed supplemental asset entry.*expected object"
                ):
                    release_builder.cartridge_keys(LEGACY_ROOT)


class RepositoryAncestryTests(unittest.TestCase):
    def test_0144_recognises_all_seven_repair_only_cartridges(self) -> None:
        release_id = "202609040144-pipelinenews"
        registry = json.loads(
            (REPO / "releases" / release_id / REGISTRY).read_text(encoding="utf-8")
        )
        registered = set(registry["supplemental_assets"])
        repair_only = {
            "wider_fleet_proximity",
            "summary_seam",
            "wider_fleet_dropdown",
            "withdraw_nonanswers",
            "sector_open_neutral_sort",
            "phone_first_heights",
            "no_grading",
        }
        self.assertTrue(repair_only.isdisjoint(registered))

        applied = release_builder.cartridge_keys(release_id)
        self.assertEqual(applied, registered | repair_only)
        self.assertEqual(len(applied), 26)


if __name__ == "__main__":
    unittest.main()
