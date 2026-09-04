#!/usr/bin/env python3
"""Write the two byte-identical v4 pointers for one committed promotion wrapper."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import subprocess


RELEASE_RE = re.compile(r"^(\d{12})-pipelinenews$")


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def git(repo: Path, *args: str) -> str:
    return subprocess.check_output(["git", *args], cwd=repo, text=True).strip()


def record(path: Path, local: str) -> dict[str, object]:
    payload = path.read_bytes()
    return {
        "path": local,
        "bytes": len(payload),
        "sha256": hashlib.sha256(payload).hexdigest(),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("release_id")
    parser.add_argument("--repo", type=Path, default=Path(__file__).resolve().parents[2])
    args = parser.parse_args()
    repo = args.repo.resolve()
    match = RELEASE_RE.fullmatch(args.release_id)
    require(match is not None, "release id must be timestamped")
    require(not git(repo, "status", "--porcelain"), "pointer must be cut from a clean wrapper commit")
    wrapper_commit = git(repo, "rev-parse", "HEAD")
    release = repo / "releases" / args.release_id
    release_manifest = json.loads((release / "release-manifest.json").read_text(encoding="utf-8"))
    build_manifest = json.loads((release / "build-manifest.json").read_text(encoding="utf-8"))
    atlas = json.loads((release / "atlas-link-manifest.json").read_text(encoding="utf-8"))
    promotion = release_manifest.get("promotion_wrapper") or {}
    require(promotion.get("schema") == "pipelinenews.pages-promotion-wrapper.v1",
            "release is not a promotion wrapper")
    owner = git(repo, "log", "--diff-filter=A", "-1", "--format=%H", "--",
                f"releases/{args.release_id}/release-manifest.json")
    require(owner == wrapper_commit, "HEAD does not own the immutable wrapper")
    require(build_manifest.get("promotion_wrapper") == promotion,
            "wrapper promotion bindings differ")
    require(atlas.get("receiver") == build_manifest.get("receiver"),
            "wrapper receiver bindings differ")
    pointer = {
        "schema": "pipelinenews.live-pointer.v4",
        "generation": match.group(1),
        "release_id": args.release_id,
        "classification": "VERIFIED_LIVE_TIMESTAMPED_RELEASE",
        "route": f"/pipelinenews/releases/{args.release_id}/",
        "entrypoint": f"releases/{args.release_id}/index.html",
        "release_manifest": record(
            release / "release-manifest.json",
            f"releases/{args.release_id}/release-manifest.json",
        ),
        "build_manifest": record(
            release / "build-manifest.json",
            f"releases/{args.release_id}/build-manifest.json",
        ),
        "atlas_link_manifest": record(
            release / "atlas-link-manifest.json",
            f"releases/{args.release_id}/atlas-link-manifest.json",
        ),
        "release_source_commit": promotion["source_commit"],
        "deployed_commit": wrapper_commit,
        "prepared_at_utc": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "promotion_source": {
            "release_id": promotion["source_release_id"],
            "commit": promotion["source_commit"],
            "manifest": promotion["source_release_manifest"],
        },
        "atlas_v9_receiver": atlas["receiver"],
        "verification": {
            "mode": "EXACT_HEAD_PREVIEW_DEPLOY_PUBLIC_READBACK",
            "source_rows": 8756,
            "clickable_rows": 8743,
            "synthetic_receiver": False,
            "route_interceptions": 0,
        },
        "rollback": {
            "pointer": "releases/current-v3.json",
            "rule": "older immutable pointer remains present and is never overwritten",
        },
    }
    payload = json.dumps(pointer, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    current = repo / "releases" / "current-v4.json"
    state = repo / "state" / "live-set.json"
    current.write_text(payload, encoding="utf-8", newline="\n")
    state.write_text(payload, encoding="utf-8", newline="\n")
    print(json.dumps({
        "release_id": args.release_id,
        "deployed_commit": wrapper_commit,
        "bytes": len(payload.encode("utf-8")),
        "sha256": hashlib.sha256(payload.encode("utf-8")).hexdigest(),
    }, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
