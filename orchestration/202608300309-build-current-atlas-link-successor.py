#!/usr/bin/env python3
"""Build a timestamped PipelineNews successor changing only the verified Atlas receiver."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
from pathlib import Path
from typing import Any


POINTER_PATH = Path("assets/202608291447-atlas-pointer-deep-link.mjs")
ALLOWED_CHANGED = {
    "index.html",
    POINTER_PATH.as_posix(),
    "atlas-link-manifest.json",
    "build-manifest.json",
    "release-manifest.json",
    "sha256sums.txt",
}


def require(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    require(isinstance(value, dict), f"JSON root is not an object: {path}")
    return value


def validate_atlas(state: dict[str, Any], minimum_generation: str) -> dict[str, str]:
    generation = str(state.get("generation") or "")
    require(re.fullmatch(r"\d{12}", generation) is not None, "Atlas generation is invalid")
    require(int(generation) >= int(minimum_generation), "Atlas generation is below the minimum")
    current = state.get("current") or {}
    verification = state.get("verification") or {}
    release_id = str(current.get("release_id") or "")
    live_url = str(current.get("live_url") or "")
    source_commit = str(current.get("source_commit") or "")
    publication_commit = str(current.get("publication_commit") or "")
    require(re.fullmatch(r"\d{12}-atlas-v9", release_id) is not None, "Atlas release ID is invalid")
    require(live_url == f"https://ventusltd.github.io/gridatlas/{release_id}/", "Atlas live URL mismatch")
    require(re.fullmatch(r"[a-f0-9]{40}", source_commit) is not None, "Atlas source commit is invalid")
    require(re.fullmatch(r"[a-f0-9]{40}", publication_commit) is not None, "Atlas publication commit is invalid")
    require(verification.get("promotion_eligible") is True, "Atlas is not promotion eligible")
    require(int(verification.get("failed_gates", 999)) == 0, "Atlas has failed gates")
    return {
        "generation": generation,
        "release_id": release_id,
        "live_url": live_url,
        "source_commit": source_commit,
        "publication_commit": publication_commit,
    }


def pointer_module(
    generation: str,
    atlas: dict[str, str],
    golden_repd_ref: str,
    state_url: str,
) -> str:
    receiver = {
        "schema": "pipelinenews.gridatlas-live-pointer-receipt.v3",
        "classification": "VERIFIED_PROMOTION_ELIGIBLE_GRIDATLAS_V9",
        "generation": atlas["generation"],
        "release_id": atlas["release_id"],
        "base_url": atlas["live_url"],
        "source_commit": atlas["source_commit"],
        "publication_commit": atlas["publication_commit"],
        "query_parameter": "repd_ref",
        "identity_rule": "EXACT_REPD_REF_ONLY",
        "golden_repd_ref": golden_repd_ref,
        "state_url": state_url,
    }
    return f'''const GRIDATLAS_RECEIVER = Object.freeze({json.dumps(receiver, separators=(",", ":"))});

function invariant(condition, message) {{
  if (!condition) throw new Error(`Atlas receiver contract: ${{message}}`);
}}

const receiverUrl = new URL(GRIDATLAS_RECEIVER.base_url);
invariant(GRIDATLAS_RECEIVER.classification === "VERIFIED_PROMOTION_ELIGIBLE_GRIDATLAS_V9", "receiver not verified");
invariant(receiverUrl.protocol === "https:", "receiver is not HTTPS");
invariant(receiverUrl.hostname === "ventusltd.github.io", "receiver hostname changed");
invariant(receiverUrl.pathname === `/gridatlas/${{GRIDATLAS_RECEIVER.release_id}}/`, "receiver route mismatch");
invariant(GRIDATLAS_RECEIVER.identity_rule === "EXACT_REPD_REF_ONLY", "identity rule changed");

export const ATLAS_V9_DEEP_LINK_CONTRACT = Object.freeze({{
  schema: "pipelinenews.atlas-current-deep-link-cartridge.v1",
  generation: {json.dumps(generation)},
  receiver: GRIDATLAS_RECEIVER,
  eligibility: Object.freeze({{
    field: "geometry_status",
    equals: "valid",
    ineligible_result: "",
    presentation: "NO MAP"
  }}),
  identity_anchor: "repd_ref",
  query_parameter_order: Object.freeze(["repd_ref"]),
  inbound_match_semantics: "EXACT_PROJECT_REPD_REF",
  lifecycle: "timestamped PipelineNews release; receiver authenticated at build and public readback"
}});

export function buildAtlasV9DeepLink(project) {{
  if (project?.[ATLAS_V9_DEEP_LINK_CONTRACT.eligibility.field]
      !== ATLAS_V9_DEEP_LINK_CONTRACT.eligibility.equals) return "";
  const repdRef = String(project?.repd_ref ?? "").trim();
  if (!/^\\d+$/u.test(repdRef)) return "";
  const url = new URL(GRIDATLAS_RECEIVER.base_url);
  url.searchParams.set("repd_ref", repdRef);
  return url.href;
}}
'''


def verify_unchanged(source: Path, target: Path) -> None:
    for path in sorted(item for item in source.rglob("*") if item.is_file()):
        relative = path.relative_to(source).as_posix()
        if relative in ALLOWED_CHANGED or relative in {"build-manifest.json", "release-manifest.json"}:
            continue
        peer = target / relative
        require(peer.is_file(), f"source file disappeared: {relative}")
        require(peer.read_bytes() == path.read_bytes(), f"unapproved source-release byte change: {relative}")


def write_manifests(
    target: Path,
    source_release_id: str,
    release_id: str,
    generation: str,
    source_commit: str,
    atlas: dict[str, str],
    golden_repd_ref: str,
    state_url: str,
) -> None:
    atlas_manifest = {
        "schema": "pipelinenews.atlas-current-link-manifest.v1",
        "classification": "VERIFIED_GRIDATLAS_V9_RECEIVER_BOUND",
        "generation": generation,
        "pipeline_release_id": release_id,
        "source_pipeline_release_id": source_release_id,
        "atlas": {**atlas, "state_url": state_url},
        "identity": {
            "parameter": "repd_ref",
            "rule": "EXACT_REPD_REF_ONLY",
            "golden_repd_ref": golden_repd_ref,
            "golden_url": f'{atlas["live_url"]}?repd_ref={golden_repd_ref}',
        },
        "data_changes": 0,
        "news_changes": 0,
        "project_changes": 0,
    }
    (target / "atlas-link-manifest.json").write_text(
        json.dumps(atlas_manifest, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
        newline="\n",
    )

    files = []
    for path in sorted(
        item
        for item in target.rglob("*")
        if item.is_file() and item.name not in {"sha256sums.txt", "build-manifest.json", "release-manifest.json"}
    ):
        files.append(
            {
                "path": path.relative_to(target).as_posix(),
                "bytes": path.stat().st_size,
                "sha256": sha256(path),
            }
        )
    build = {
        "schema": "pipelinenews.current-atlas-link-build-manifest.v1",
        "classification": "DETERMINISTIC_RECEIVER_ONLY_BUILD",
        "generation": generation,
        "release_id": release_id,
        "source_release_id": source_release_id,
        "source_commit": source_commit,
        "atlas_release_id": atlas["release_id"],
        "allowed_changed_paths": sorted(ALLOWED_CHANGED),
        "files": files,
    }
    (target / "build-manifest.json").write_text(
        json.dumps(build, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    release = {
        "schema": "pipelinenews.current-atlas-link-release.v1",
        "classification": "CURRENT_ATLAS_LINK_CANDIDATE",
        "generation": generation,
        "release_id": release_id,
        "parent_release_id": source_release_id,
        "immutable_after_publication": True,
        "atlas_release_id": atlas["release_id"],
        "atlas_live_url": atlas["live_url"],
        "golden_repd_ref": golden_repd_ref,
        "promotion_policy": "LOCAL_AND_PUBLIC_BROWSER_DEEP_LINK_PROOF",
    }
    (target / "release-manifest.json").write_text(
        json.dumps(release, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    sums = []
    for path in sorted(item for item in target.rglob("*") if item.is_file() and item.name != "sha256sums.txt"):
        sums.append(f"{sha256(path)}  {path.relative_to(target).as_posix()}\n")
    (target / "sha256sums.txt").write_text("".join(sums), encoding="utf-8", newline="\n")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--release-id", required=True)
    parser.add_argument("--generation", required=True)
    parser.add_argument("--source-commit", required=True)
    parser.add_argument("--atlas-state", required=True)
    parser.add_argument("--atlas-state-url", required=True)
    parser.add_argument("--minimum-atlas-generation", required=True)
    parser.add_argument("--golden-repd-ref", default="16135")
    args = parser.parse_args()

    source = Path(args.source)
    target = Path(args.output)
    require(source.is_dir(), f"source release missing: {source}")
    require(not target.exists(), f"immutable output already exists: {target}")
    require(re.fullmatch(r"\d{12}-pipelinenews", args.release_id) is not None, "release ID invalid")
    require(re.fullmatch(r"\d{12}", args.generation) is not None, "generation invalid")
    require(args.release_id == f"{args.generation}-pipelinenews", "release ID and generation differ")
    require(re.fullmatch(r"\d+", args.golden_repd_ref) is not None, "golden REPD Ref invalid")

    atlas = validate_atlas(load_json(Path(args.atlas_state)), args.minimum_atlas_generation)
    shutil.copytree(source, target)
    for stale in ["build-manifest.json", "release-manifest.json", "sha256sums.txt"]:
        (target / stale).unlink(missing_ok=True)

    pointer = target / POINTER_PATH
    pointer.write_text(
        pointer_module(args.generation, atlas, args.golden_repd_ref, args.atlas_state_url),
        encoding="utf-8",
        newline="\n",
    )

    index_path = target / "index.html"
    index = index_path.read_text(encoding="utf-8")
    index, count = re.subn(
        r"https://ventusltd\.github\.io/gridatlas/[0-9]{12}-atlas-v9/",
        atlas["live_url"],
        index,
    )
    require(count >= 2, f"expected at least two direct Atlas links, found {count}")
    index = index.replace(
        'data-fast-generation="202608291447" data-release-id="202608291447-pipelinenews"',
        f'data-fast-generation="{args.generation}" data-release-id="{args.release_id}"',
    )
    index = index.replace(
        "<title>PipelineNews | Atlas V9 deep-link successor 202608291447</title>",
        f"<title>PipelineNews | Current verified Atlas V9 deep-link successor {args.generation}</title>",
    )
    index_path.write_text(index, encoding="utf-8", newline="\n")

    verify_unchanged(source, target)
    write_manifests(
        target,
        source.name,
        args.release_id,
        args.generation,
        args.source_commit,
        atlas,
        args.golden_repd_ref,
        args.atlas_state_url,
    )
    print(
        json.dumps(
            {
                "classification": "DETERMINISTIC_RECEIVER_ONLY_BUILD",
                "release_id": args.release_id,
                "source_release_id": source.name,
                "atlas_release_id": atlas["release_id"],
                "golden_url": f'{atlas["live_url"]}?repd_ref={args.golden_repd_ref}',
            },
            sort_keys=True,
        )
    )


if __name__ == "__main__":
    main()
