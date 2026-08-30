#!/usr/bin/env python3
"""Synchronise PipelineNews mutable sources to the promoted Atlas V9 deep-link contract."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any, Iterable
from urllib.parse import urlencode, urlparse, parse_qs

MIN_RENDER_READY_GENERATION = "202608292311"
VALID_TECHNOLOGIES = {"solar", "bess", "wind_onshore", "wind_offshore"}
TEXT_EXTENSIONS = {".html", ".js", ".mjs", ".cjs", ".ts", ".tsx", ".py", ".json"}
SOURCE_ROOTS = {"ui", "src", "javascript", "templates", "index", "compiler", "app", "public"}
EXCLUDED_ROOTS = {
    ".git", ".github", "node_modules", "vendor", "archive", "archives", "releases",
    "dist", "build", "work", "coverage", "machine-learning", "data", "reports", "state"
}
TIMESTAMPED = re.compile(r"^\d{12}(?:-|$)")
OLD_BASES = (
    "https://globalgrid2050.com/repd_grid_atlasv8/",
    "https://globalgrid2050.com/repd_grid_atlasv8",
    "http://globalgrid2050.com/repd_grid_atlasv8/",
    "http://globalgrid2050.com/repd_grid_atlasv8",
)
OLD_V9 = re.compile(r"https://ventusltd\.github\.io/gridatlas/\d{12}-atlas-v9/?")


def require(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


def load(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    require(isinstance(value, dict), f"JSON root is not an object: {path}")
    return value


def normalise_base(value: str) -> str:
    parsed = urlparse(value)
    require(parsed.scheme == "https", "Atlas base must use HTTPS")
    require(parsed.netloc in {"globalgrid2050.com", "www.globalgrid2050.com"}, "Atlas base must use GlobalGrid2050")
    require(re.fullmatch(r"/\d{12}-atlas-v9/", parsed.path) is not None, "Atlas base is not an immutable V9 route")
    return value.rstrip("/") + "/"


def mutable_files(root: Path) -> Iterable[Path]:
    for path in sorted(root.rglob("*")):
        if not path.is_file() or path.suffix.lower() not in TEXT_EXTENSIONS:
            continue
        relative = path.relative_to(root)
        parts = relative.parts
        if not parts:
            continue
        first = parts[0]
        if first in EXCLUDED_ROOTS or TIMESTAMPED.match(first):
            continue
        if len(parts) > 1 and first not in SOURCE_ROOTS and first != "scripts":
            continue
        if relative.as_posix() == "scripts/202608300232-sync-atlas-v9-deep-links.py":
            continue
        yield path


def rewrite_source(text: str, base_url: str) -> tuple[str, int]:
    replacements = 0
    updated = text
    for old in OLD_BASES:
        count = updated.count(old)
        if count:
            updated = updated.replace(old, base_url)
            replacements += count
    updated, count = OLD_V9.subn(base_url, updated)
    replacements += count
    return updated, replacements


def build_url(base_url: str, repd_ref: str, technology: str, **optional: object) -> str:
    ref = str(repd_ref).strip()
    tech = str(technology).strip()
    require(re.fullmatch(r"[A-Za-z0-9-]{1,40}", ref) is not None, "invalid REPD reference")
    require(tech in VALID_TECHNOLOGIES, "invalid Atlas technology")
    query: dict[str, str] = {"repd_ref": ref, "technology": tech}
    for key in ("name", "longitude", "latitude"):
        value = optional.get(key)
        if value is not None and str(value).strip():
            query[key] = str(value).strip()
    return base_url + "?" + urlencode(query)


def validate_url(url: str, expected_ref: str, expected_technology: str) -> None:
    parsed = urlparse(url)
    query = parse_qs(parsed.query)
    require(query.get("repd_ref") == [expected_ref], f"deep-link REPD identity mismatch: {url}")
    require(query.get("technology") == [expected_technology], f"deep-link technology mismatch: {url}")


def javascript_module(release_id: str, base_url: str) -> str:
    return f"""(() => {{
  'use strict';
  const RELEASE_ID = {json.dumps(release_id)};
  const BASE_URL = {json.dumps(base_url)};
  const TECHNOLOGIES = new Set(['solar', 'bess', 'wind_onshore', 'wind_offshore']);
  const REPD_REF = /^[A-Za-z0-9-]{{1,40}}$/;

  function buildAtlasV9Url(project) {{
    const repdRef = String(project?.repd_ref ?? project?.repdRef ?? '').trim();
    const technology = String(project?.technology ?? '').trim();
    if (!REPD_REF.test(repdRef) || !TECHNOLOGIES.has(technology)) return null;
    const query = new URLSearchParams({{ repd_ref: repdRef, technology }});
    for (const key of ['name', 'longitude', 'latitude']) {{
      const value = project?.[key];
      if (value !== undefined && value !== null && String(value).trim()) query.set(key, String(value).trim());
    }}
    return `${{BASE_URL}}?${{query.toString()}}`;
  }}

  window.GridAtlasV9DeepLinks = Object.freeze({{ releaseId: RELEASE_ID, baseUrl: BASE_URL, build: buildAtlasV9Url }});
}})();
"""


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--gridatlas", required=True, type=Path)
    parser.add_argument("--globalgrid", required=True, type=Path)
    parser.add_argument("--repo-root", default=".", type=Path)
    args = parser.parse_args()

    atlas_state = load(args.gridatlas / "state/live-set.json")
    generation = str(atlas_state.get("generation") or "")
    if generation < MIN_RENDER_READY_GENERATION:
        print(json.dumps({"classification": "WAITING_FOR_RENDER_READY_PROMOTION", "generation": generation}, sort_keys=True))
        return 0

    verification = atlas_state.get("verification") or {}
    current = atlas_state.get("current") or {}
    require(verification.get("promotion_eligible") is True, "Atlas current release is not promotion eligible")
    require(int(verification.get("failed_gates", -1)) == 0, "Atlas current release has failed gates")
    release_id = str(current.get("release_id") or "")
    require(re.fullmatch(r"\d{12}-atlas-v9", release_id) is not None, "invalid Atlas release id")

    global_pointer = load(args.globalgrid / "state/gridatlas-v9-current.json")
    require(global_pointer.get("classification") == "MIRRORED_PROMOTED_GRIDATLAS_V9", "GlobalGrid mirror is not promoted")
    require(global_pointer.get("release_id") == release_id, "GlobalGrid mirror and Atlas pointer disagree")
    base_url = normalise_base(str(global_pointer.get("globalgrid_live_url") or ""))

    root = args.repo_root.resolve()
    changed_files: list[str] = []
    replacement_count = 0
    for path in mutable_files(root):
        try:
            original = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        updated, replacements = rewrite_source(original, base_url)
        if replacements:
            path.write_text(updated, encoding="utf-8", newline="\n")
            changed_files.append(path.relative_to(root).as_posix())
            replacement_count += replacements

    module_path = root / "ui/atlas-v9-deep-links.js"
    module_path.parent.mkdir(parents=True, exist_ok=True)
    module_path.write_text(javascript_module(release_id, base_url), encoding="utf-8", newline="\n")

    sentinels = [
        {"name": "Beacon Fen", "repd_ref": "13599", "technology": "solar"},
        {"name": "East Pye", "repd_ref": "17494", "technology": "solar"},
    ]
    for sentinel in sentinels:
        sentinel["atlas_v9_url"] = build_url(base_url, sentinel["repd_ref"], sentinel["technology"], name=sentinel["name"])
        validate_url(sentinel["atlas_v9_url"], sentinel["repd_ref"], sentinel["technology"])

    pointer = {
        "schema": "pipelinenews.atlas-v9-pointer.v1",
        "classification": "PROMOTED_ATLAS_V9_DEEP_LINK_SOURCE",
        "generation": generation,
        "release_id": release_id,
        "base_url": base_url,
        "identity": ["repd_ref", "technology"],
        "optional_evidence": ["name", "longitude", "latitude"],
        "name_or_coordinate_identity_permitted": False,
        "source_pointer": "Ventusltd/gridatlas:state/live-set.json",
        "globalgrid_pointer": "Ventusltd/globalgrid2050:state/gridatlas-v9-current.json",
    }
    pointer_path = root / "state/atlas-v9-current.json"
    pointer_path.parent.mkdir(parents=True, exist_ok=True)
    pointer_path.write_text(json.dumps(pointer, indent=2, sort_keys=True) + "\n", encoding="utf-8", newline="\n")

    audit = {
        "schema": "pipelinenews.atlas-v9-deep-link-audit.v1",
        "classification": "CANONICAL_DEEP_LINKS_READY",
        "release_id": release_id,
        "base_url": base_url,
        "files_rewritten": sorted(changed_files),
        "replacement_count": replacement_count,
        "sentinels": sentinels,
        "immutable_releases_modified": 0,
        "privacy": "NO_PERSONAL_DATA",
    }
    audit_path = root / "reports/atlas-v9-deep-link-audit.json"
    audit_path.parent.mkdir(parents=True, exist_ok=True)
    audit_path.write_text(json.dumps(audit, indent=2, sort_keys=True) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps(audit, sort_keys=True))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:  # noqa: BLE001
        print(f"PIPELINENEWS_ATLAS_V9_SYNC_FAILED: {error}", file=sys.stderr)
        raise
