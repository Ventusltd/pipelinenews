#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from pages_release_classifier import ClassificationError, classify_release


class ClassifierTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.repo = Path(self.temp.name)

    def tearDown(self) -> None:
        self.temp.cleanup()

    def manifest(self, folder_id: str, **values: object) -> None:
        root = self.repo / "releases" / folder_id
        root.mkdir(parents=True)
        values.setdefault("release_id", folder_id)
        values.setdefault("generation", folder_id[:12])
        if values.get("schema") == "pipelinenews.additive-cartridge-release.v1":
            values.setdefault("deployment", "not-authorised")
            values.setdefault("parent_release_id", "202608291447-pipelinenews")
            parent_id = str(values["parent_release_id"])
            if parent_id < folder_id:
                parent_root = self.repo / "releases" / parent_id
                parent_root.mkdir(parents=True, exist_ok=True)
                parent_path = parent_root / "release-manifest.json"
                if not parent_path.exists():
                    parent_path.write_text(
                        json.dumps(
                            {
                                "release_id": parent_id,
                                "generation": parent_id[:12],
                                "schema": "pipelinenews.timestamp-folder-successor.v1",
                            }
                        ),
                        encoding="utf-8",
                    )
        if values.get("schema") != "pipelinenews.timestamp-folder-successor.v1":
            values.setdefault("immutable_after_publication", True)
        (root / "release-manifest.json").write_text(json.dumps(values), encoding="utf-8")

    def test_routes_pages_release(self) -> None:
        self.manifest("202608291447-pipelinenews", schema="pipelinenews.timestamp-folder-successor.v1")
        decision = classify_release(self.repo, "202608291447-pipelinenews")
        self.assertEqual(decision.route, "pages")

    def test_routes_additive_release_to_source_validation(self) -> None:
        self.manifest("202609032251-pipelinenews", schema="pipelinenews.additive-cartridge-release.v1")
        decision = classify_release(self.repo, "202609032251-pipelinenews")
        self.assertEqual(decision.route, "source-only")

    def test_unknown_schema_fails_closed(self) -> None:
        self.manifest("202609032252-pipelinenews", schema="invented")
        with self.assertRaises(ClassificationError):
            classify_release(self.repo, "202609032252-pipelinenews")

    def test_release_id_cannot_escape_release_root(self) -> None:
        with self.assertRaises(ClassificationError):
            classify_release(self.repo, "../../outside")

    def test_manifest_identity_must_match_directory(self) -> None:
        release_id = "202609032253-pipelinenews"
        self.manifest(release_id, release_id="202609032254-pipelinenews", schema="pipelinenews.additive-cartridge-release.v1")
        with self.assertRaises(ClassificationError):
            classify_release(self.repo, release_id)

    def test_generation_must_match_release_id(self) -> None:
        release_id = "202609032255-pipelinenews"
        self.manifest(release_id, generation="202609032254", schema="pipelinenews.additive-cartridge-release.v1")
        with self.assertRaises(ClassificationError):
            classify_release(self.repo, release_id)

    def test_duplicate_manifest_keys_fail_closed(self) -> None:
        release_id = "202609032256-pipelinenews"
        root = self.repo / "releases" / release_id
        root.mkdir(parents=True)
        (root / "release-manifest.json").write_text(
            '{"release_id":"%s","generation":"202609032256",'
            '"schema":"pipelinenews.additive-cartridge-release.v1","schema":"invented"}' % release_id,
            encoding="utf-8",
        )
        with self.assertRaises(ClassificationError):
            classify_release(self.repo, release_id)

    def test_additive_release_cannot_claim_deployment_authority(self) -> None:
        release_id = "202609032257-pipelinenews"
        self.manifest(
            release_id,
            schema="pipelinenews.additive-cartridge-release.v1",
            deployment="authorised",
        )
        with self.assertRaises(ClassificationError):
            classify_release(self.repo, release_id)

    def test_modern_release_must_be_immutable(self) -> None:
        release_id = "202609032258-pipelinenews"
        self.manifest(
            release_id,
            schema="pipelinenews.additive-cartridge-release.v1",
            immutable_after_publication=False,
        )
        with self.assertRaises(ClassificationError):
            classify_release(self.repo, release_id)

    def test_additive_parent_must_be_valid_and_older(self) -> None:
        release_id = "202609032259-pipelinenews"
        self.manifest(
            release_id,
            schema="pipelinenews.additive-cartridge-release.v1",
            parent_release_id=release_id,
        )
        with self.assertRaises(ClassificationError):
            classify_release(self.repo, release_id)

    def test_additive_parent_must_exist(self) -> None:
        release_id = "202609032300-pipelinenews"
        self.manifest(release_id, schema="pipelinenews.additive-cartridge-release.v1")
        parent = self.repo / "releases" / "202608291447-pipelinenews"
        (parent / "release-manifest.json").unlink()
        with self.assertRaises(ClassificationError):
            classify_release(self.repo, release_id)


if __name__ == "__main__":
    unittest.main()
