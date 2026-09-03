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


if __name__ == "__main__":
    unittest.main()
