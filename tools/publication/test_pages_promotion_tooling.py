#!/usr/bin/env python3
from __future__ import annotations

import json
import importlib.util
from pathlib import Path
import subprocess
import tempfile
import unittest

import build_pages_promotion_wrapper as wrapper


ROOT = Path(__file__).resolve().parents[2]
SOURCE_RELEASE = "202609040044-pipelinenews"
SOURCE_COMMIT = "20514b74172eef5748df6adf2b21bde942ce82ed"


ATMAN_SPEC = importlib.util.spec_from_file_location(
    "pages_build_gate", ROOT / "atman/202608262014-build-pages.py"
)
assert ATMAN_SPEC is not None and ATMAN_SPEC.loader is not None
pages_gate = importlib.util.module_from_spec(ATMAN_SPEC)
ATMAN_SPEC.loader.exec_module(pages_gate)


class PromotionToolingTests(unittest.TestCase):
    def test_exact_source_closure_is_available_without_mutation(self) -> None:
        files = wrapper.verify_source_release(ROOT, SOURCE_RELEASE, SOURCE_COMMIT)
        self.assertGreater(len(files), 60)
        self.assertIn("release-manifest.json", files)
        self.assertIn("assets/202609040044-atlas-pointer-deep-link.mjs", files)

    def test_receiver_builder_fails_closed_on_wrong_digest(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            repo = Path(temporary)
            (repo / "atlas/cartridges").mkdir(parents=True)
            (repo / "atlas/manifests").mkdir(parents=True)
            (repo / "tools/proofs").mkdir(parents=True)
            (repo / "atlas/cartridges/202601010000-sld.js").write_text("sld\n")
            (repo / "atlas/cartridges/202601010000-engine.js").write_text("engine\n")
            (repo / "atlas/manifests/202601010000-composition.json").write_text("{}\n")
            (repo / "tools/proofs/202601010000-sld-sandbox.proof.mjs").write_text("// proof\n")
            current = {
                "schema": "gridatlas.current.v2",
                "generation": "202601010000",
                "cartridges": [
                    {"id": "sld-sandbox", "generation": "202601010000", "version": "v9.1",
                     "path": "./cartridges/202601010000-sld.js", "sha256": "0" * 64},
                    {"id": "substation-intelligence", "generation": "202601010000", "version": "v9.1",
                     "path": "./cartridges/202601010000-engine.js", "sha256": "0" * 64},
                ],
            }
            (repo / "atlas/current.json").write_text(json.dumps(current) + "\n")
            subprocess.run(["git", "init", "-q"], cwd=repo, check=True)
            subprocess.run(["git", "config", "user.email", "test@example.invalid"], cwd=repo, check=True)
            subprocess.run(["git", "config", "user.name", "test"], cwd=repo, check=True)
            subprocess.run(["git", "add", "."], cwd=repo, check=True)
            subprocess.run(["git", "commit", "-qm", "fixture"], cwd=repo, check=True)
            head = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=repo, text=True).strip()
            with self.assertRaisesRegex(AssertionError, "current digest changed"):
                wrapper.receiver_contract(repo, head)

    def test_wrapper_builder_requires_clean_pipeline_checkout(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            repo = Path(temporary)
            subprocess.run(["git", "init", "-q"], cwd=repo, check=True)
            subprocess.run(["git", "config", "user.email", "test@example.invalid"], cwd=repo, check=True)
            subprocess.run(["git", "config", "user.name", "test"], cwd=repo, check=True)
            fixture = repo / "fixture.txt"
            fixture.write_text("clean\n")
            subprocess.run(["git", "add", "."], cwd=repo, check=True)
            subprocess.run(["git", "commit", "-qm", "fixture"], cwd=repo, check=True)
            wrapper.require_clean_checkout(repo, "Pipeline validator")
            fixture.write_text("dirty\n")
            with self.assertRaisesRegex(AssertionError, "Pipeline validator checkout is dirty"):
                wrapper.require_clean_checkout(repo, "Pipeline validator")

    def test_receiver_builder_fails_closed_on_wrong_head(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            repo = Path(temporary)
            subprocess.run(["git", "init", "-q"], cwd=repo, check=True)
            subprocess.run(["git", "config", "user.email", "test@example.invalid"], cwd=repo, check=True)
            subprocess.run(["git", "config", "user.name", "test"], cwd=repo, check=True)
            (repo / "fixture.txt").write_text("fixture\n")
            subprocess.run(["git", "add", "."], cwd=repo, check=True)
            subprocess.run(["git", "commit", "-qm", "fixture"], cwd=repo, check=True)
            with self.assertRaisesRegex(AssertionError, "not exact commit"):
                wrapper.receiver_contract(repo, "0" * 40)

    def test_source_builder_fails_closed_on_wrong_commit(self) -> None:
        with self.assertRaises(subprocess.CalledProcessError):
            wrapper.verify_source_release(ROOT, SOURCE_RELEASE, "0" * 40)

    def test_workflow_uses_read_only_exact_receiver_checkout(self) -> None:
        source = (ROOT / ".github/workflows/202608301214-pages-v2.yml").read_text()
        self.assertIn("steps.promotion.outputs.receiver_commit", source)
        self.assertIn("repository: Ventusltd/gridatlas", source)
        self.assertIn("prove_pages_promotion_wrapper.mjs", source)
        self.assertIn(".promotion_wrapper.schema // empty", source)
        self.assertIn("if test -z \"$promotion_schema\"; then exit 0; fi", source)
        self.assertLess(
            source.index("Validate committed products and stage public closure"),
            source.index("Prove the complete MAP corpus against production receiver bytes"),
        )
        receiver_step = source.split("Checkout the exact Grid production receiver read-only", 1)[1]
        receiver_step = receiver_step.split("Prove the complete MAP corpus", 1)[0]
        self.assertIn("persist-credentials: false", receiver_step)

    def test_workflow_checks_out_pinned_geodesy_beside_grid_before_proof(self) -> None:
        source = (ROOT / ".github/workflows/202608301214-pages-v2.yml").read_text()
        grid_step = "Checkout the exact Grid production receiver read-only"
        geodesy_step = "Checkout the exact canonical geodesy read-only"
        proof_step = "Prove the complete MAP corpus against production receiver bytes"
        self.assertLess(source.index(grid_step), source.index(geodesy_step))
        self.assertLess(source.index(geodesy_step), source.index(proof_step))
        checkout = source.split(geodesy_step, 1)[1].split(
            "Validate committed products and stage public closure", 1
        )[0]
        self.assertIn(
            "uses: actions/checkout@fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09",
            checkout,
        )
        self.assertIn("repository: Ventusltd/grid-distance-maths", checkout)
        self.assertIn("ref: 30d2f817a4b007b7c3be334f3aff308331a848b8", checkout)
        self.assertIn("path: _receiver/grid-distance-maths", checkout)
        self.assertIn("persist-credentials: false", checkout)

    def test_javascript_proofs_parse(self) -> None:
        for relative in (
            "tools/publication/prove_pages_promotion_wrapper.mjs",
            "atman/pages-promotion-wrapper-readback.mjs",
        ):
            subprocess.run(["node", "--check", relative], cwd=ROOT, check=True)

    def test_browser_readback_binds_public_receiver_bytes_and_identity(self) -> None:
        source = (ROOT / "atman/pages-promotion-wrapper-readback.mjs").read_text()
        self.assertIn("new URL('current.json', receiver.base_url)", source)
        self.assertIn("digest !== record.sha256", source)
        self.assertIn("['VERIFIED', 'RECOMPUTED'].includes", source)
        self.assertIn("identity_verification?.repd_ref || ''", source)
        self.assertIn("atlasState.links_drawn <= 0", source)
        self.assertIn("atlasState.last_selection?.count !== atlasState.links_drawn", source)
        self.assertIn("km straight", source)
        self.assertIn("Network.emulateNetworkConditions", source)
        self.assertIn("connectionType: 'cellular4g'", source)
        self.assertIn("timeout: 600000", source)
        self.assertIn("probe.searchParams.set('technology', 'Biomass (dedicated)')", source)
        self.assertIn("pipeline.matching_action_count !== 1", source)
        self.assertIn("pipeline.wider_technology !== 'Biomass (dedicated)'", source)
        self.assertIn("error?.stack || error?.message", source)

    def test_modular_browser_proof_intercepts_immutable_news_payload(self) -> None:
        source = (ROOT / "atman/202608262014-browser-proof.mjs").read_text()
        route = '"**/data/news/*-major-project-news-v9-5-1.json*"'
        interception = (
            'assert.equal(failedNewsRequests, 1, '
            '"expected to intercept exactly one immutable news payload request")'
        )
        unavailable = (
            'assert.match(await failClosed.locator("#stories").innerText(), '
            '/unavailable|No location-verified|No headlines match/i)'
        )
        self.assertIn(route, source)
        self.assertNotIn("${generation}-major-project-news-v9-5-1.json", source)
        self.assertIn("failedNewsRequests += 1", source)
        self.assertLess(source.index(route), source.index(interception))
        self.assertLess(source.index(interception), source.index(unavailable))

    def test_pointer_source_manifest_receipt_fails_closed(self) -> None:
        manifest_receipt = {
            "path": f"releases/{SOURCE_RELEASE}/release-manifest.json",
            "bytes": 123,
            "sha256": "a" * 64,
        }
        timestamp_folder = {
            "source_release_id": SOURCE_RELEASE,
            "source_commit": SOURCE_COMMIT,
            "manifest": {"promotion_wrapper": {
                "source_release_manifest": manifest_receipt,
            }},
        }
        pointer = {"promotion_source": {
            "release_id": SOURCE_RELEASE,
            "commit": SOURCE_COMMIT,
            "manifest": manifest_receipt,
        }}
        pages_gate.validate_pages_promotion_source_pointer(pointer, timestamp_folder)
        pointer["promotion_source"]["manifest"] = {
            **manifest_receipt, "sha256": "b" * 64,
        }
        with self.assertRaisesRegex(AssertionError, "source receipt changed"):
            pages_gate.validate_pages_promotion_source_pointer(pointer, timestamp_folder)

    def test_main_dispatch_reaches_promotion_pointer_validator(self) -> None:
        source = (ROOT / "atman/202608262014-build-pages.py").read_text()
        self.assertIn(
            '"current-atlas-link-v2", "pages-promotion-wrapper-v1",',
            source,
        )

    def test_pages_stage_excludes_non_deploying_promotion_source_tree(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            source = root / "source"
            target = root / "target"
            (source / "kept").mkdir(parents=True)
            (source / "not-authorised/nested").mkdir(parents=True)
            (source / "kept/index.html").write_text("kept\n")
            (source / "not-authorised/nested/index.html").write_text("excluded\n")
            pages_gate.copy_release_tree(
                source,
                target,
                set(),
                {"releases/not-authorised"},
            )
            self.assertTrue((target / "kept/index.html").is_file())
            self.assertFalse((target / "not-authorised").exists())

    def test_non_deploying_source_exclusion_is_independent_of_selected_release(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            release_id = "202601010000-pipelinenews"
            source = root / "releases" / release_id
            source.mkdir(parents=True)
            (source / "release-manifest.json").write_text(json.dumps({
                "schema": "pipelinenews.additive-cartridge-release.v1",
                "release_id": release_id,
                "deployment": "not-authorised",
            }))
            self.assertEqual(
                pages_gate.nondeploying_release_trees(root),
                {f"releases/{release_id}"},
            )
            manifest = json.loads((source / "release-manifest.json").read_text())
            manifest["deployment"] = "candidate"
            (source / "release-manifest.json").write_text(json.dumps(manifest))
            with self.assertRaisesRegex(AssertionError, "gained direct Pages authority"):
                pages_gate.nondeploying_release_trees(root)

    def test_promotion_public_diff_starts_after_immutable_source(self) -> None:
        release = {"timestamp_folder": {
            "kind": "pages-promotion-wrapper-v1",
            "source_commit": SOURCE_COMMIT,
        }}
        self.assertEqual(pages_gate.pages_public_change_base(release), SOURCE_COMMIT)
        self.assertEqual(pages_gate.pages_public_change_base({}), pages_gate.ATLAS_V9_SOURCE_PARENT)
        release["timestamp_folder"]["source_commit"] = "not-a-commit"
        with self.assertRaisesRegex(AssertionError, "public-diff source changed"):
            pages_gate.pages_public_change_base(release)


if __name__ == "__main__":
    unittest.main()
