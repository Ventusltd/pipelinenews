#!/usr/bin/env python3
"""Promote a publicly proven PipelineNews release bound to a verified Atlas V9 receiver."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def require(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


def load(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    require(isinstance(value, dict), f"JSON root is not an object: {path}")
    return value


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def file_record(path: Path, repository_path: str) -> dict[str, Any]:
    return {
        "path": repository_path,
        "bytes": path.stat().st_size,
        "sha256": sha256(path),
    }


def validate_atlas(state: dict[str, Any], minimum_generation: str) -> dict[str, Any]:
    generation = str(state.get("generation") or "")
    current = state.get("current") or {}
    verification = state.get("verification") or {}
    release_id = str(current.get("release_id") or "")
    base_url = str(current.get("live_url") or "")
    require(re.fullmatch(r"\d{12}", generation) is not None, "Atlas generation invalid")
    require(int(generation) >= int(minimum_generation), "Atlas generation below minimum")
    require(re.fullmatch(r"\d{12}-atlas-v9", release_id) is not None, "Atlas release invalid")
    require(base_url == f"https://ventusltd.github.io/gridatlas/{release_id}/", "Atlas base URL mismatch")
    require(verification.get("promotion_eligible") is True, "Atlas not promotion eligible")
    require(int(verification.get("failed_gates", 999)) == 0, "Atlas has failed gates")
    return {
        "generation": generation,
        "release_id": release_id,
        "base_url": base_url,
        "source_commit": current.get("source_commit"),
        "publication_commit": current.get("publication_commit"),
        "identity_rule": "EXACT_REPD_REF_ONLY",
        "query_parameter": "repd_ref",
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--release-dir", required=True)
    parser.add_argument("--release-id", required=True)
    parser.add_argument("--generation", required=True)
    parser.add_argument("--source-release-id", required=True)
    parser.add_argument("--release-source-commit", required=True)
    parser.add_argument("--publication-commit", required=True)
    parser.add_argument("--public-url", required=True)
    parser.add_argument("--public-proof", required=True)
    parser.add_argument("--atlas-state", required=True)
    parser.add_argument("--atlas-state-url", required=True)
    parser.add_argument("--minimum-atlas-generation", required=True)
    parser.add_argument("--golden-repd-ref", default="16135")
    parser.add_argument("--previous-state", required=True)
    parser.add_argument("--output-state", required=True)
    parser.add_argument("--output-current", required=True)
    parser.add_argument("--output-link-contract", required=True)
    args = parser.parse_args()

    require(re.fullmatch(r"\d{12}", args.generation) is not None, "generation invalid")
    require(args.release_id == f"{args.generation}-pipelinenews", "release ID mismatch")
    require(re.fullmatch(r"[a-f0-9]{40}", args.release_source_commit) is not None, "source commit invalid")
    require(re.fullmatch(r"[a-f0-9]{40}", args.publication_commit) is not None, "publication commit invalid")
    require(re.fullmatch(r"\d+", args.golden_repd_ref) is not None, "golden REPD Ref invalid")
    require(
        args.public_url == f"https://ventusltd.github.io/pipelinenews/releases/{args.release_id}/",
        "PipelineNews public URL mismatch",
    )

    release_dir = Path(args.release_dir)
    require(release_dir.is_dir(), f"release directory missing: {release_dir}")
    release_manifest_path = release_dir / "release-manifest.json"
    build_manifest_path = release_dir / "build-manifest.json"
    atlas_link_manifest_path = release_dir / "atlas-link-manifest.json"
    for path in (release_manifest_path, build_manifest_path, atlas_link_manifest_path):
        require(path.is_file(), f"release evidence missing: {path}")

    release_manifest = load(release_manifest_path)
    build_manifest = load(build_manifest_path)
    atlas_link_manifest = load(atlas_link_manifest_path)
    require(release_manifest.get("release_id") == args.release_id, "release manifest identity mismatch")
    require(build_manifest.get("release_id") == args.release_id, "build manifest identity mismatch")
    require(build_manifest.get("classification") == "DETERMINISTIC_RECEIVER_ONLY_BUILD", "build not deterministic")
    require(atlas_link_manifest.get("data_changes") == 0, "data changed")
    require(atlas_link_manifest.get("news_changes") == 0, "news changed")
    require(atlas_link_manifest.get("project_changes") == 0, "projects changed")

    atlas = validate_atlas(load(Path(args.atlas_state)), args.minimum_atlas_generation)
    require(atlas_link_manifest.get("atlas", {}).get("release_id") == atlas["release_id"], "Atlas release drift")
    require(atlas_link_manifest.get("atlas", {}).get("live_url") == atlas["base_url"], "Atlas URL drift")

    proof_path = Path(args.public_proof)
    proof = load(proof_path)
    require(proof.get("classification") == "VERIFIED_PUBLIC_PIPELINENEWS_ATLAS_V9_DEEP_LINK", "public proof classification mismatch")
    require(proof.get("mode") == "public", "public proof mode mismatch")
    require(proof.get("pipeline_url") == args.public_url, "public proof PipelineNews URL mismatch")
    expected_receiver = f'{atlas["base_url"]}?repd_ref={args.golden_repd_ref}'
    require(proof.get("expected_url") == expected_receiver, "public proof receiver mismatch")
    require(proof.get("synthetic_receiver") is False, "synthetic receiver evidence forbidden")
    require(int(proof.get("route_interceptions", 999)) == 0, "route interception detected")
    require(proof.get("errors") == [], "public proof contains errors")

    previous = load(Path(args.previous_state))
    require(previous.get("release_id") == args.source_release_id, "predecessor pointer moved")
    require(previous.get("classification") == "VERIFIED_LIVE_TIMESTAMPED_RELEASE", "predecessor is not green")

    verified_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    atlas_receiver = {
        **atlas,
        "state_url": args.atlas_state_url,
        "golden_repd_ref": args.golden_repd_ref,
        "golden_url": expected_receiver,
    }
    state = {
        "schema": "pipelinenews.live-pointer.v4",
        "generation": args.generation,
        "release_id": args.release_id,
        "classification": "VERIFIED_LIVE_TIMESTAMPED_RELEASE",
        "route": f"/pipelinenews/releases/{args.release_id}/",
        "entrypoint": f"releases/{args.release_id}/index.html",
        "release_manifest": file_record(
            release_manifest_path,
            f"releases/{args.release_id}/release-manifest.json",
        ),
        "build_manifest": file_record(
            build_manifest_path,
            f"releases/{args.release_id}/build-manifest.json",
        ),
        "atlas_link_manifest": file_record(
            atlas_link_manifest_path,
            f"releases/{args.release_id}/atlas-link-manifest.json",
        ),
        "release_source_commit": args.release_source_commit,
        "deployed_commit": args.publication_commit,
        "verified_at_utc": verified_at,
        "atlas_v9_receiver": atlas_receiver,
        "predecessor": {
            "release_id": args.source_release_id,
            "classification": previous.get("classification"),
            "public_url": f"https://ventusltd.github.io/pipelinenews/releases/{args.source_release_id}/",
            "deployed_commit": previous.get("deployed_commit"),
        },
        "rollback": previous.get("rollback"),
        "public_proof": {
            "classification": proof["classification"],
            "path": proof_path.as_posix(),
            "sha256": sha256(proof_path),
            "pipeline_url": args.public_url,
            "receiver_url": expected_receiver,
            "synthetic_receiver": False,
            "route_interceptions": 0,
        },
    }

    link_contract = {
        "schema": "pipelinenews.atlas-v9-link-contract.v1",
        "classification": "VERIFIED_CURRENT_ATLAS_V9_RECEIVER",
        "generation": args.generation,
        "pipeline_release_id": args.release_id,
        "receiver": atlas_receiver,
        "join": {
            "identity_key": "repd_ref",
            "query_parameter": "repd_ref",
            "identity_rule": "EXACT_REPD_REF_ONLY",
            "url_template": f'{atlas["base_url"]}?repd_ref={{repd_ref}}',
        },
        "proof": state["public_proof"],
        "rollback": state["predecessor"],
    }

    state_payload = json.dumps(state, indent=2, sort_keys=True) + "\n"
    current_path = Path(args.output_current)
    state_path = Path(args.output_state)
    contract_path = Path(args.output_link_contract)
    for path in (state_path, current_path, contract_path):
        path.parent.mkdir(parents=True, exist_ok=True)
    state_path.write_text(state_payload, encoding="utf-8", newline="\n")
    current_path.write_text(state_payload, encoding="utf-8", newline="\n")
    contract_path.write_text(
        json.dumps(link_contract, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    print(
        json.dumps(
            {
                "classification": "VERIFIED_PIPELINENEWS_ATLAS_LINK_POINTER_BUILT",
                "release_id": args.release_id,
                "atlas_release_id": atlas["release_id"],
                "receiver_url": expected_receiver,
            },
            sort_keys=True,
        )
    )


if __name__ == "__main__":
    main()
