#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
import subprocess
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from pages_release_classifier import (
    ClassificationError,
    classify_release,
    discover_release,
    release_ids_from_paths,
    require_commit,
    resolve_live_pointer,
    write_github_output,
    write_receipt,
)


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

    def test_oversized_manifest_fails_before_parsing(self) -> None:
        release_id = "202609032301-pipelinenews"
        root = self.repo / "releases" / release_id
        root.mkdir(parents=True)
        (root / "release-manifest.json").write_bytes(b" " * (1024 * 1024 + 1))
        with self.assertRaises(ClassificationError):
            classify_release(self.repo, release_id)

    def test_decision_receipts_exact_manifest_bytes(self) -> None:
        release_id = "202609032302-pipelinenews"
        self.manifest(release_id, schema="pipelinenews.additive-cartridge-release.v1")
        decision = classify_release(self.repo, release_id)
        raw = (self.repo / "releases" / release_id / "release-manifest.json").read_bytes()
        import hashlib
        self.assertEqual(decision.manifest_bytes, len(raw))
        self.assertEqual(decision.manifest_sha256, hashlib.sha256(raw).hexdigest())

    def test_github_outputs_are_scalar_and_job_ready(self) -> None:
        release_id = "202609032303-pipelinenews"
        self.manifest(release_id, schema="pipelinenews.additive-cartridge-release.v1")
        output = self.repo / "github-output"
        write_github_output(classify_release(self.repo, release_id), output)
        values = dict(line.split("=", 1) for line in output.read_text().splitlines())
        self.assertEqual(values["route"], "source-only")
        self.assertEqual(values["pages_applicable"], "false")

    def test_receipt_replace_is_complete_json(self) -> None:
        release_id = "202609032304-pipelinenews"
        self.manifest(release_id, schema="pipelinenews.additive-cartridge-release.v1")
        receipt = self.repo / "reports" / "classification.json"
        write_receipt(classify_release(self.repo, release_id), receipt)
        self.assertEqual(json.loads(receipt.read_text())["release_id"], release_id)
        self.assertTrue(receipt.read_bytes().endswith(b"\n"))

    def test_current_committed_additive_release_classifies(self) -> None:
        repo = Path(__file__).resolve().parents[2]
        decision = classify_release(repo, "202609032251-pipelinenews")
        self.assertEqual(decision.route, "source-only")
        self.assertEqual(
            decision.schema, "pipelinenews.additive-cartridge-release.v1"
        )
        self.assertGreater(decision.manifest_bytes, 1000)

    def test_release_paths_are_deduplicated_and_sorted(self) -> None:
        self.assertEqual(
            release_ids_from_paths(
                [
                    "docs/coordination/BOARD.md",
                    "releases/202609032251-pipelinenews/index.html",
                    "releases\\202609032251-pipelinenews\\release-manifest.json",
                    "releases/202608291447-pipelinenews/index.html",
                ]
            ),
            ["202608291447-pipelinenews", "202609032251-pipelinenews"],
        )

    def test_discovers_release_from_git_commit_range(self) -> None:
        subprocess.run(["git", "init", "-q"], cwd=self.repo, check=True)
        subprocess.run(["git", "config", "user.email", "test@example.invalid"], cwd=self.repo, check=True)
        subprocess.run(["git", "config", "user.name", "classifier test"], cwd=self.repo, check=True)
        (self.repo / "README").write_text("base\n", encoding="utf-8")
        self.manifest(
            "202608291447-pipelinenews",
            schema="pipelinenews.timestamp-folder-successor.v1",
        )
        subprocess.run(["git", "add", "README", "releases"], cwd=self.repo, check=True)
        subprocess.run(["git", "commit", "-qm", "base"], cwd=self.repo, check=True)
        base = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=self.repo, text=True).strip()
        release_id = "202609032305-pipelinenews"
        self.manifest(release_id, schema="pipelinenews.additive-cartridge-release.v1")
        subprocess.run(["git", "add", "releases"], cwd=self.repo, check=True)
        subprocess.run(["git", "commit", "-qm", "release"], cwd=self.repo, check=True)
        head = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=self.repo, text=True).strip()
        self.assertEqual(discover_release(self.repo, base, head), release_id)

    def test_git_range_with_two_releases_is_ambiguous(self) -> None:
        subprocess.run(["git", "init", "-q"], cwd=self.repo, check=True)
        subprocess.run(["git", "config", "user.email", "test@example.invalid"], cwd=self.repo, check=True)
        subprocess.run(["git", "config", "user.name", "classifier test"], cwd=self.repo, check=True)
        (self.repo / "README").write_text("base\n", encoding="utf-8")
        subprocess.run(["git", "add", "README"], cwd=self.repo, check=True)
        subprocess.run(["git", "commit", "-qm", "base"], cwd=self.repo, check=True)
        base = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=self.repo, text=True).strip()
        for release_id in ("202609032306-pipelinenews", "202609032307-pipelinenews"):
            self.manifest(release_id, schema="pipelinenews.timestamp-folder-successor.v1")
        subprocess.run(["git", "add", "releases"], cwd=self.repo, check=True)
        subprocess.run(["git", "commit", "-qm", "two releases"], cwd=self.repo, check=True)
        head = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=self.repo, text=True).strip()
        with self.assertRaises(ClassificationError):
            discover_release(self.repo, base, head)

    def test_git_range_rejects_immutable_release_edits(self) -> None:
        subprocess.run(["git", "init", "-q"], cwd=self.repo, check=True)
        subprocess.run(["git", "config", "user.email", "test@example.invalid"], cwd=self.repo, check=True)
        subprocess.run(["git", "config", "user.name", "classifier test"], cwd=self.repo, check=True)
        release_id = "202609032308-pipelinenews"
        self.manifest(release_id, schema="pipelinenews.timestamp-folder-successor.v1")
        subprocess.run(["git", "add", "releases"], cwd=self.repo, check=True)
        subprocess.run(["git", "commit", "-qm", "release"], cwd=self.repo, check=True)
        base = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=self.repo, text=True).strip()
        manifest = self.repo / "releases" / release_id / "release-manifest.json"
        manifest.write_text(manifest.read_text() + "\n", encoding="utf-8")
        subprocess.run(["git", "add", "releases"], cwd=self.repo, check=True)
        subprocess.run(["git", "commit", "-qm", "mutate"], cwd=self.repo, check=True)
        head = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=self.repo, text=True).strip()
        with self.assertRaises(ClassificationError):
            discover_release(self.repo, base, head)

    def test_abbreviated_commit_is_rejected(self) -> None:
        subprocess.run(["git", "init", "-q"], cwd=self.repo, check=True)
        with self.assertRaises(ClassificationError):
            require_commit(self.repo, "937b8c0", "base")

    def test_resolves_the_committed_live_pointer(self) -> None:
        repo = Path(__file__).resolve().parents[2]
        self.assertEqual(resolve_live_pointer(repo), "202608291447-pipelinenews")

    def pointer_bytes(self, release_id: str, *, digest: str | None = None) -> bytes:
        manifest_path = self.repo / "releases" / release_id / "release-manifest.json"
        raw = manifest_path.read_bytes()
        import hashlib
        return (json.dumps(
            {
                "schema": "pipelinenews.live-pointer.v3",
                "generation": release_id[:12],
                "release_id": release_id,
                "entrypoint": f"releases/{release_id}/index.html",
                "release_manifest": {
                    "path": f"releases/{release_id}/release-manifest.json",
                    "bytes": len(raw),
                    "sha256": digest or hashlib.sha256(raw).hexdigest(),
                },
            },
            sort_keys=True,
        ) + "\n").encode()

    def test_live_pointer_rejects_a_stale_manifest_digest(self) -> None:
        release_id = "202609032309-pipelinenews"
        self.manifest(release_id, schema="pipelinenews.timestamp-folder-successor.v1")
        payload = self.pointer_bytes(release_id, digest="0" * 64)
        (self.repo / "state").mkdir()
        (self.repo / "state" / "live-set.json").write_bytes(payload)
        (self.repo / "releases" / "current-v3.json").write_bytes(payload)
        with self.assertRaises(ClassificationError):
            resolve_live_pointer(self.repo)

    def test_live_pointer_rejects_two_identical_current_files(self) -> None:
        release_id = "202609032310-pipelinenews"
        self.manifest(release_id, schema="pipelinenews.timestamp-folder-successor.v1")
        payload = self.pointer_bytes(release_id)
        (self.repo / "state").mkdir()
        (self.repo / "state" / "live-set.json").write_bytes(payload)
        (self.repo / "releases" / "current-v3.json").write_bytes(payload)
        (self.repo / "releases" / "current-v4.json").write_bytes(payload)
        with self.assertRaises(ClassificationError):
            resolve_live_pointer(self.repo)

    def test_zero_release_diff_can_resolve_the_live_pointer(self) -> None:
        repo = Path(__file__).resolve().parents[2]
        head = subprocess.check_output(
            ["git", "rev-parse", "HEAD"], cwd=repo, text=True
        ).strip()
        self.assertEqual(
            discover_release(repo, head, head, allow_pointer_fallback=True),
            "202608291447-pipelinenews",
        )


if __name__ == "__main__":
    unittest.main()
