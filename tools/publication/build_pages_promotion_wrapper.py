#!/usr/bin/env python3
"""Build one immutable Pages wrapper around an additive Pipeline release.

The source release is copied byte-for-byte.  Only the four wrapper-control
files (the release, build, Atlas-binding and SHA manifests) are new.  The
receiver contract is derived from a clean GridAtlas checkout at an exact
commit; no branch name or moving pointer is accepted.
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import posixpath
import re
import shutil
import subprocess


RELEASE_RE = re.compile(r"^(\d{12})-pipelinenews$")
COMMIT_RE = re.compile(r"^[0-9a-f]{40}$")
SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
CONTROL_FILES = frozenset({
    "atlas-link-manifest.json",
    "build-manifest.json",
    "release-manifest.json",
    "sha256sums.txt",
})


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def git(repo: Path, *args: str) -> str:
    return subprocess.check_output(["git", *args], cwd=repo, text=True).strip()


def require_clean_checkout(repo: Path, label: str) -> None:
    require(not git(repo, "status", "--porcelain"), f"{label} checkout is dirty")


def sha256_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def sha256(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def record(path: Path, local: str) -> dict[str, object]:
    return {"path": local, "bytes": path.stat().st_size, "sha256": sha256(path)}


def compact_digest(value: object) -> str:
    payload = json.dumps(
        value, ensure_ascii=False, sort_keys=True, separators=(",", ":")
    ).encode("utf-8")
    return sha256_bytes(payload)


def write_json(path: Path, value: object) -> None:
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
        newline="\n",
    )


def committed_tree_files(repo: Path, commit: str, release_id: str) -> list[str]:
    prefix = f"releases/{release_id}/"
    lines = git(repo, "ls-tree", "-r", "--name-only", commit, "--", prefix).splitlines()
    files = [line.removeprefix(prefix) for line in lines if line.startswith(prefix)]
    require(files, f"source release is absent from {commit}: {release_id}")
    return sorted(files)


def verify_source_release(repo: Path, release_id: str, source_commit: str) -> list[str]:
    require(COMMIT_RE.fullmatch(source_commit) is not None, "source commit must be exact")
    match = RELEASE_RE.fullmatch(release_id)
    require(match is not None, "source release id must be timestamped")
    subprocess.run(
        ["git", "cat-file", "-e", f"{source_commit}^{{commit}}"],
        cwd=repo, check=True, capture_output=True,
    )
    source = repo / "releases" / release_id
    require(source.is_dir() and not source.is_symlink(), "source release folder is missing")
    committed = committed_tree_files(repo, source_commit, release_id)
    actual = sorted(
        path.relative_to(source).as_posix() for path in source.rglob("*") if path.is_file()
    )
    require(actual == committed, "source release working tree differs from committed closure")
    for local in committed:
        disk = (source / local).read_bytes()
        blob = subprocess.check_output(
            ["git", "show", f"{source_commit}:releases/{release_id}/{local}"], cwd=repo
        )
        require(disk == blob, f"source release byte drift: {local}")
    manifest = json.loads((source / "release-manifest.json").read_text(encoding="utf-8"))
    require(manifest.get("release_id") == release_id, "source manifest identity changed")
    require(
        manifest.get("schema") == "pipelinenews.additive-cartridge-release.v1"
        and manifest.get("deployment") == "not-authorised",
        "source is not an unpromoted additive release",
    )
    return committed


def grid_file_record(grid: Path, local: str) -> dict[str, object]:
    target = grid / local
    require(target.is_file() and not target.is_symlink(), f"Grid receiver file missing: {local}")
    return record(target, local)


def receiver_contract(grid: Path, exact_commit: str) -> dict[str, object]:
    require(COMMIT_RE.fullmatch(exact_commit) is not None, "Grid commit must be exact")
    require_clean_checkout(grid, "Grid receiver")
    require(git(grid, "rev-parse", "HEAD") == exact_commit, "Grid checkout is not exact commit")
    current_path = grid / "atlas" / "current.json"
    current = json.loads(current_path.read_text(encoding="utf-8"))
    require(current.get("schema") == "gridatlas.current.v2", "Grid current schema changed")
    generation = str(current.get("generation", ""))
    require(re.fullmatch(r"\d{12}", generation) is not None, "Grid generation changed")
    cartridges = {item.get("id"): item for item in current.get("cartridges", [])}
    measurement = cartridges.get("sld-sandbox") or {}
    engine = cartridges.get("substation-intelligence") or {}
    require(re.fullmatch(r"v9\.\d+", str(measurement.get("version", ""))) is not None,
            "Grid receiver version changed")

    def cartridge(item: dict, label: str) -> dict[str, object]:
        relative = str(item.get("path", "")).removeprefix("./")
        require(
            relative.startswith("cartridges/")
            and posixpath.normpath(relative) == relative
            and all(part not in ("", ".", "..") for part in relative.split("/")),
            f"{label} path left cartridges",
        )
        result = grid_file_record(grid, f"atlas/{relative}")
        require(result["sha256"] == item.get("sha256"), f"{label} current digest changed")
        result["generation"] = item.get("generation")
        result["version"] = item.get("version")
        return result

    measurement_record = cartridge(measurement, "measurement receiver")
    engine_record = cartridge(engine, "engine receiver")
    composition = grid_file_record(
        grid, f"atlas/manifests/{generation}-composition.json"
    )
    proof = grid_file_record(grid, f"tools/proofs/{generation}-sld-sandbox.proof.mjs")
    return {
        "schema": "pipelinenews.gridatlas-production-receiver.v1",
        "repository": "Ventusltd/gridatlas",
        "commit": exact_commit,
        "generation": generation,
        "version": measurement_record["version"],
        "base_url": "https://ventusltd.github.io/gridatlas/atlas/",
        "measurement_cartridge": measurement_record,
        "engine_cartridge": engine_record,
        "composition_manifest": composition,
        "production_proof": proof,
        "required_result": "MEASURE_LINK_FIRST",
        "identity_reconciliation": "VERIFY_CONCURRENTLY_AND_REMEASURE_AT_RESOLVED_POINT",
    }


def build(
    repo: Path,
    source_release_id: str,
    source_commit: str,
    grid: Path,
    grid_commit: str,
    generation: str,
) -> str:
    require(re.fullmatch(r"\d{12}", generation) is not None, "generation must be UTC YYYYMMDDHHMM")
    require_clean_checkout(repo, "Pipeline validator")
    source_match = RELEASE_RE.fullmatch(source_release_id)
    require(source_match is not None, "source release id must be timestamped")
    source_generation = source_match.group(1)
    require(generation > source_generation, "wrapper generation must follow source")
    source_files = verify_source_release(repo, source_release_id, source_commit)
    validator_commit = git(repo, "rev-parse", "HEAD")
    subprocess.run(
        ["git", "merge-base", "--is-ancestor", source_commit, validator_commit],
        cwd=repo, check=True, capture_output=True,
    )
    receiver = receiver_contract(grid, grid_commit)
    release_id = f"{generation}-pipelinenews"
    target = repo / "releases" / release_id
    require(not target.exists(), f"wrapper already exists: {release_id}")
    target.mkdir(parents=True)
    source = repo / "releases" / source_release_id

    copied: list[dict[str, object]] = []
    for local in source_files:
        if local in CONTROL_FILES:
            continue
        destination = target / local
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source / local, destination)
        copied.append(record(destination, local))
    copied.sort(key=lambda item: str(item["path"]))
    copied_digest = compact_digest(copied)
    source_manifest_record = record(
        source / "release-manifest.json",
        f"releases/{source_release_id}/release-manifest.json",
    )
    promotion = {
        "schema": "pipelinenews.pages-promotion-wrapper.v1",
        "source_release_id": source_release_id,
        "source_commit": source_commit,
        "validator_commit": validator_commit,
        "copied_file_count": len(copied),
        "copied_files_sha256": copied_digest,
        "source_release_manifest": source_manifest_record,
        "receiver_contract_sha256": compact_digest(receiver),
    }
    atlas = {
        "schema": "pipelinenews.atlas-current-link-manifest.v2",
        "classification": "VERIFIED_GRIDATLAS_PRODUCTION_RECEIVER_BOUND",
        "generation": generation,
        "pipeline_release_id": release_id,
        "source_pipeline_release_id": source_release_id,
        "source_commit": source_commit,
        "transport": {
            "identity_rule": "EXACT_REPD_REF",
            "query_parameter_order": [
                "repd_ref", "project", "technology", "capacity_mw",
                "latitude", "longitude", "zoom",
            ],
            "source_rows": 8756,
            "clickable_rows": 8743,
            "unresolved_rows": 13,
        },
        "receiver": receiver,
        "receiver_contract_sha256": promotion["receiver_contract_sha256"],
    }
    write_json(target / "atlas-link-manifest.json", atlas)

    files = copied + [record(target / "atlas-link-manifest.json", "atlas-link-manifest.json")]
    files.sort(key=lambda item: str(item["path"]))
    build_manifest = {
        "schema": "pipelinenews.current-atlas-link-build-manifest.v2",
        "classification": "DETERMINISTIC_SOURCE_RELEASE_PROMOTION",
        "generation": generation,
        "release_id": release_id,
        "source_release_id": source_release_id,
        "source_commit": source_commit,
        "validator_commit": validator_commit,
        "promotion_wrapper": promotion,
        "receiver": receiver,
        "files": files,
    }
    write_json(target / "build-manifest.json", build_manifest)
    release_manifest = {
        "schema": "pipelinenews.current-atlas-link-release.v2",
        "classification": "CURRENT_ATLAS_LINK_CANDIDATE",
        "generation": generation,
        "release_id": release_id,
        "immutable_after_publication": True,
        "deployment": "candidate",
        "parent_release_id": source_release_id,
        "product_surface": "BYTE_IDENTICAL_ADDITIVE_RELEASE_PLUS_FINAL_GRID_RECEIVER",
        "application_changes": 0,
        "data_changes": 0,
        "news_changes": 0,
        "project_changes": 0,
        "promotion_wrapper": promotion,
        "atlas_live_url": receiver["base_url"],
        "atlas_receiver_commit": receiver["commit"],
        "atlas_receiver_version": receiver["version"],
    }
    write_json(target / "release-manifest.json", release_manifest)
    ledger_files = sorted(path for path in target.rglob("*") if path.is_file())
    ledger = "".join(
        f"{sha256(path)}  {path.relative_to(target).as_posix()}\n" for path in ledger_files
    )
    (target / "sha256sums.txt").write_text(ledger, encoding="utf-8", newline="\n")
    print(json.dumps({
        "release_id": release_id,
        "source_commit": source_commit,
        "validator_commit": validator_commit,
        "grid_commit": grid_commit,
        "copied_files": len(copied),
        "receiver_version": receiver["version"],
    }, sort_keys=True))
    return release_id


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", type=Path, default=Path(__file__).resolve().parents[2])
    parser.add_argument("--source-release", required=True)
    parser.add_argument("--source-commit", required=True)
    parser.add_argument("--gridatlas", type=Path)
    parser.add_argument("--grid-commit")
    parser.add_argument("--generation")
    parser.add_argument("--check-source", action="store_true")
    args = parser.parse_args()
    repo = args.repo.resolve()
    if args.check_source:
        files = verify_source_release(repo, args.source_release, args.source_commit)
        print(json.dumps({"status": "PASS", "files": len(files)}, sort_keys=True))
        return 0
    require(args.gridatlas is not None and args.grid_commit is not None,
            "--gridatlas and --grid-commit are required")
    generation = args.generation or datetime.now(timezone.utc).strftime("%Y%m%d%H%M")
    build(
        repo, args.source_release, args.source_commit,
        args.gridatlas.resolve(), args.grid_commit, generation,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
