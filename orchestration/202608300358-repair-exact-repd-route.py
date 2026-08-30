#!/usr/bin/env python3
"""Repair PipelineNews exact-REPD routing without changing data, news, or project bytes."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path
from typing import Any

APP_RELATIVE = Path("assets/202608291447-app.mjs")
APP_REPAIRS = (
    (
        "    if (tokens.length) {\n",
        "    if (!requestedRepdRef && tokens.length) {\n",
        "exact REPD identity bypasses broad-search row text",
    ),
    (
        "  if (query) await ensureSearchSupplement();\n",
        "  if (query && !requestedRepdRef) await ensureSearchSupplement();\n",
        "exact REPD identity does not fetch broad-search supplement",
    ),
)


def require(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


def load_json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    require(isinstance(value, dict), f"JSON root is not an object: {path}")
    return value


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_json(path: Path, value: dict[str, Any]) -> None:
    path.write_text(
        json.dumps(value, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
        newline="\n",
    )


def replace_exactly_once(source: str, before: str, after: str, label: str) -> str:
    count = source.count(before)
    require(count == 1, f"repair anchor mismatch for {label}: {count}")
    require(after not in source, f"repair already applied for {label}")
    return source.replace(before, after)


def refresh_file_inventory(root: Path, build: dict[str, Any]) -> None:
    files: list[dict[str, Any]] = []
    excluded = {"sha256sums.txt", "build-manifest.json", "release-manifest.json"}
    for path in sorted(item for item in root.rglob("*") if item.is_file() and item.name not in excluded):
        files.append(
            {
                "path": path.relative_to(root).as_posix(),
                "bytes": path.stat().st_size,
                "sha256": sha256(path),
            }
        )
    build["files"] = files


def write_sha256sums(root: Path) -> None:
    rows: list[str] = []
    for path in sorted(item for item in root.rglob("*") if item.is_file() and item.name != "sha256sums.txt"):
        rows.append(f"{sha256(path)}  {path.relative_to(root).as_posix()}\n")
    (root / "sha256sums.txt").write_text("".join(rows), encoding="utf-8", newline="\n")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--release-dir", required=True)
    parser.add_argument("--golden-repd-ref", required=True)
    args = parser.parse_args()

    root = Path(args.release_dir)
    require(root.is_dir(), f"release directory missing: {root}")
    require(re.fullmatch(r"\d+", args.golden_repd_ref) is not None, "golden REPD Ref invalid")

    app_path = root / APP_RELATIVE
    atlas_manifest_path = root / "atlas-link-manifest.json"
    build_manifest_path = root / "build-manifest.json"
    release_manifest_path = root / "release-manifest.json"
    for path in (app_path, atlas_manifest_path, build_manifest_path, release_manifest_path):
        require(path.is_file(), f"required candidate file missing: {path}")

    app = app_path.read_text(encoding="utf-8")
    repairs: list[dict[str, str]] = []
    for before, after, label in APP_REPAIRS:
        app = replace_exactly_once(app, before, after, label)
        repairs.append({"id": label, "before": before.strip(), "after": after.strip()})
    app_path.write_text(app, encoding="utf-8", newline="\n")

    atlas_manifest = load_json(atlas_manifest_path)
    require(atlas_manifest.get("data_changes") == 0, "builder data-change boundary moved")
    require(atlas_manifest.get("news_changes") == 0, "builder news-change boundary moved")
    require(atlas_manifest.get("project_changes") == 0, "builder project-change boundary moved")
    require(
        str(atlas_manifest.get("identity", {}).get("golden_repd_ref")) == args.golden_repd_ref,
        "golden REPD identity differs from receiver contract",
    )
    atlas_manifest.update(
        {
            "application_changes": 1,
            "deep_link_logic_changes": len(APP_REPAIRS),
            "exact_identity_route": {
                "parameter": "repd_ref",
                "stable_key_source": "compact project index field zero",
                "broad_search_supplement_required": False,
                "broad_search_supplement_requests_expected": 0,
                "golden_repd_ref": args.golden_repd_ref,
            },
        }
    )
    write_json(atlas_manifest_path, atlas_manifest)

    build = load_json(build_manifest_path)
    require(build.get("classification") == "DETERMINISTIC_RECEIVER_ONLY_BUILD", "builder classification moved")
    build.update(
        {
            "schema": "pipelinenews.current-atlas-link-build-manifest.v2",
            "application_changes": 1,
            "data_changes": 0,
            "news_changes": 0,
            "project_changes": 0,
            "deep_link_logic_changes": len(APP_REPAIRS),
            "deep_link_repairs": repairs,
            "golden_repd_ref": args.golden_repd_ref,
        }
    )
    allowed = set(build.get("allowed_changed_paths") or [])
    allowed.add(APP_RELATIVE.as_posix())
    build["allowed_changed_paths"] = sorted(allowed)
    refresh_file_inventory(root, build)
    write_json(build_manifest_path, build)

    release = load_json(release_manifest_path)
    release.update(
        {
            "schema": "pipelinenews.current-atlas-link-release.v2",
            "product_surface": "SOURCE_RELEASE_PLUS_VERIFIED_ATLAS_RECEIVER_AND_EXACT_REPD_ROUTE",
            "application_changes": 1,
            "data_changes": 0,
            "news_changes": 0,
            "project_changes": 0,
            "exact_identity_route": {
                "parameter": "repd_ref",
                "golden_repd_ref": args.golden_repd_ref,
                "broad_search_supplement_requests_expected": 0,
            },
        }
    )
    write_json(release_manifest_path, release)

    write_sha256sums(root)
    print(
        json.dumps(
            {
                "classification": "DETERMINISTIC_EXACT_REPD_ROUTE_REPAIRED",
                "release_id": root.name,
                "golden_repd_ref": args.golden_repd_ref,
                "application_changes": 1,
                "data_changes": 0,
                "news_changes": 0,
                "project_changes": 0,
                "deep_link_logic_changes": len(APP_REPAIRS),
                "app_sha256": sha256(app_path),
            },
            sort_keys=True,
        )
    )


if __name__ == "__main__":
    main()
