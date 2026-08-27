#!/usr/bin/env python3
"""Audit the committed Atlas V8 successor against the production Pages gate."""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import tempfile
import types
from pathlib import Path


EXPECTED_FAIL_CLOSED_REASON = (
    "public releases/data/archive tree changed after the green candidate commit"
)


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def git_text(root: Path, *arguments: str) -> str:
    completed = subprocess.run(
        ["git", *arguments],
        cwd=root,
        check=True,
        capture_output=True,
        text=True,
    )
    return completed.stdout.strip()


def load_pages_gate(root: Path):
    module_path = root / "atman/202608262014-build-pages.py"
    require(module_path.is_file(), "cannot load the Pages gate")
    module = types.ModuleType("pipelinenews_pages_gate")
    module.__file__ = str(module_path)
    exec(compile(module_path.read_bytes(), str(module_path), "exec"), module.__dict__)
    return module


def governed_release(module, root: Path) -> dict:
    generation, _, manifest = module.select_release(root, "latest")
    return {
        "generation": generation,
        "release_path": f"releases/{generation}-index.html",
        "manifest": manifest,
    }


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=".")
    parser.add_argument("--generation", required=True)
    parser.add_argument("--output-commit", required=True)
    return parser.parse_args()


def main() -> None:
    arguments = parse_arguments()
    root = Path(arguments.root).resolve()
    generation = arguments.generation
    output_commit = arguments.output_commit
    require(bool(re.fullmatch(r"\d{12}", generation)), "invalid generation")
    require(bool(re.fullmatch(r"[0-9a-f]{40}", output_commit)), "invalid output commit")
    require(git_text(root, "rev-parse", f"{output_commit}^{{commit}}") == output_commit, "missing output commit")

    module = load_pages_gate(root)
    manifest_path = root / "build" / f"{generation}-v8-fast-site-manifest.json"
    candidate = json.loads(manifest_path.read_text(encoding="utf-8"))
    require(candidate.get("generation") == generation, "candidate generation changed")
    require(candidate.get("deployment") == "not-authorised", "candidate is no longer quarantined")
    require(
        git_text(root, "log", "-1", "--format=%H", "--", manifest_path.relative_to(root).as_posix())
        == output_commit,
        "output commit no longer owns the candidate manifest",
    )
    expected = {record["path"] for record in candidate["outputs"]}
    require(len(expected) == 4, "candidate output closure changed")

    authorisations = sorted((root / "build/authorisations").glob("*-v8-fast-pages-authorisation.json"))
    require(len(authorisations) == 1, "expected exactly one existing fast-candidate authorisation")
    active_authorisation = authorisations[0]
    require(not active_authorisation.name.startswith(generation), "13:29 unexpectedly has an authorisation")

    actual_release = governed_release(module, root)
    actual_outcome = None
    try:
        module.candidate_publication_boundary(root, actual_release)
    except AssertionError as error:
        actual_outcome = str(error)
    require(actual_outcome == EXPECTED_FAIL_CLOSED_REASON, "production gate did not fail closed as expected")

    work = root / "work" / f"{generation}-production-pages-audit"
    work.mkdir(parents=True, exist_ok=True)
    parked_authorisation = work / active_authorisation.name
    require(not parked_authorisation.exists(), "parked authorisation path already exists")

    excluded: set[str] = set()
    authorised: set[str] = set()
    try:
        os.replace(active_authorisation, parked_authorisation)
        isolated_release = governed_release(module, root)
        excluded, authorised = module.candidate_publication_boundary(root, isolated_release)
        require(expected.issubset(excluded), "unauthorised 13:29 outputs were not excluded")
        require(expected.isdisjoint(authorised), "unauthorised 13:29 output was authorised")
        require(not authorised, "an output was authorised with the authorisation record removed")

        with tempfile.TemporaryDirectory(prefix=f"pipelinenews-{generation}-pages-") as temporary:
            site = Path(temporary) / "site"
            module.stage_site(root, site, isolated_release)
            leaked = sorted(relative for relative in expected if (site / relative).exists())
            require(not leaked, f"candidate leaked into a staged Pages site: {leaked}")
            require(
                (site / "releases/current.json").read_bytes()
                == (root / module.ARCHIVE / "releases/current.json").read_bytes(),
                "stable release pointer changed",
            )
            require(not (site / "ui").exists(), "UI source tree entered the Pages site")
            require(not (site / "atman").exists(), "Atman source tree entered the Pages site")
    finally:
        if parked_authorisation.exists():
            require(not active_authorisation.exists(), "authorisation target unexpectedly exists")
            os.replace(parked_authorisation, active_authorisation)

    require(active_authorisation.is_file(), "existing authorisation was not restored")
    require(not parked_authorisation.exists(), "parked authorisation was not removed")

    proof = {
        "schema": "pipelinenews.atman.atlas-v8-deep-link-production-pages-audit.v1",
        "generation": generation,
        "audited_head": git_text(root, "rev-parse", "HEAD"),
        "candidate_output_commit": output_commit,
        "candidate_deployment": candidate["deployment"],
        "active_authorisation": active_authorisation.relative_to(root).as_posix(),
        "production_gate": {
            "classifier_invoked": True,
            "outcome": "FAIL_CLOSED_PENDING_EXPLICIT_OWNER_PROMOTION",
            "reason": actual_outcome,
        },
        "unauthorised_branch": {
            "legacy_authorisation_temporarily_suppressed": True,
            "classifier_invoked": True,
            "stage_site_invoked": True,
            "candidate_outputs": sorted(expected),
            "candidate_outputs_excluded": sorted(expected & excluded),
            "candidate_outputs_authorised": sorted(expected & authorised),
            "candidate_outputs_leaked": [],
        },
        "stable_route_changed": False,
        "source_cartridge_published": False,
        "deployment_attempted": False,
        "status": "PASS",
    }
    print(json.dumps(proof, indent=2))


if __name__ == "__main__":
    main()
