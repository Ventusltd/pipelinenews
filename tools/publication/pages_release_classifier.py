#!/usr/bin/env python3
"""Classify one immutable Pipeline News release for the Pages workflow.

The classifier is deliberately independent of GitHub Actions.  It reads the
release manifest and returns one of two routes: ``pages`` for release classes
the Pages builder understands, or ``source-only`` for additive cartridges
whose publisher is GlobalGrid2050.  Unknown input fails closed.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import tempfile
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any


PAGES_SCHEMAS = frozenset(
    {
        "pipelinenews.timestamp-folder-successor.v1",
        "pipelinenews.current-atlas-link-release.v2",
    }
)
SOURCE_ONLY_SCHEMAS = frozenset({"pipelinenews.additive-cartridge-release.v1"})
RELEASE_ID_RE = re.compile(r"^[0-9]{12}-pipelinenews$")
RELEASE_PATH_RE = re.compile(r"^releases/([0-9]{12}-pipelinenews)(?:/|$)")
COMMIT_RE = re.compile(r"^[0-9a-f]{40}$")
MAX_MANIFEST_BYTES = 1024 * 1024


class ClassificationError(ValueError):
    """Input cannot be classified safely."""


@dataclass(frozen=True)
class Decision:
    release_id: str
    schema: str
    route: str
    reason: str
    manifest_path: str
    manifest_sha256: str
    manifest_bytes: int
    deployment: str | None


def release_ids_from_paths(paths: list[str]) -> list[str]:
    """Return sorted distinct release ids named by repository-relative paths."""
    found: set[str] = set()
    for path in paths:
        match = RELEASE_PATH_RE.match(path.replace("\\", "/"))
        if match:
            found.add(match.group(1))
    return sorted(found)


def require_commit(repo: Path, value: str, label: str) -> None:
    if not COMMIT_RE.fullmatch(value):
        raise ClassificationError(f"{label} must be a full lowercase commit oid")
    process = subprocess.run(
        ["git", "cat-file", "-e", f"{value}^{{commit}}"],
        cwd=repo,
        check=False,
        capture_output=True,
    )
    if process.returncode:
        raise ClassificationError(f"{label} is not an available commit: {value}")


def discover_release(
    repo: Path, base: str, head: str, *, allow_pointer_fallback: bool = False
) -> str:
    require_commit(repo, base, "base")
    require_commit(repo, head, "head")
    process = subprocess.run(
        ["git", "diff", "--name-status", "-z", "--find-renames", base, head, "--", "releases"],
        cwd=repo,
        check=False,
        capture_output=True,
    )
    if process.returncode:
        raise ClassificationError(
            "git diff failed: " + process.stderr.decode("utf-8", "replace").strip()
        )
    tokens = [item.decode("utf-8") for item in process.stdout.split(b"\0") if item]
    paths: list[str] = []
    index = 0
    while index < len(tokens):
        status = tokens[index]
        index += 1
        count = 2 if status[:1] in {"R", "C"} else 1
        if index + count > len(tokens):
            raise ClassificationError("malformed git name-status output")
        record_paths = tokens[index : index + count]
        index += count
        touched_release = any(RELEASE_PATH_RE.match(path.replace("\\", "/")) for path in record_paths)
        if touched_release and status != "A":
            raise ClassificationError(
                f"immutable release path has destructive status {status}: {record_paths}"
            )
        paths.extend(record_paths)
    releases = release_ids_from_paths(paths)
    if not releases and allow_pointer_fallback:
        return resolve_live_pointer(repo)
    if len(releases) != 1:
        raise ClassificationError(
            f"expected exactly one changed release, found {len(releases)}: {releases}"
        )
    return releases[0]


def _read_manifest(path: Path) -> tuple[dict[str, Any], bytes]:
    def reject_duplicates(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
        result: dict[str, Any] = {}
        for key, value in pairs:
            if key in result:
                raise ClassificationError(f"duplicate JSON key: {key}")
            result[key] = value
        return result

    try:
        if not path.is_file():
            raise ClassificationError(f"manifest is not a regular file: {path}")
        raw = path.read_bytes()
        if len(raw) > MAX_MANIFEST_BYTES:
            raise ClassificationError("release manifest exceeds 1 MiB limit")
        value = json.loads(
            raw.decode("utf-8"), object_pairs_hook=reject_duplicates
        )
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise ClassificationError(f"cannot read manifest {path}: {exc}") from exc
    if not isinstance(value, dict):
        raise ClassificationError("release manifest must be a JSON object")
    return value, raw


def _load_manifest(path: Path) -> dict[str, Any]:
    return _read_manifest(path)[0]


def classify_release(repo: Path, release_id: str) -> Decision:
    if not RELEASE_ID_RE.fullmatch(release_id):
        raise ClassificationError(f"invalid release id: {release_id!r}")
    manifest_path = repo / "releases" / release_id / "release-manifest.json"
    manifest, raw = _read_manifest(manifest_path)
    if manifest.get("release_id") != release_id:
        raise ClassificationError("manifest release_id does not match its directory")
    if manifest.get("generation") != release_id[:12]:
        raise ClassificationError("manifest generation does not match its release id")
    schema = manifest.get("schema")
    if not isinstance(schema, str) or not schema:
        raise ClassificationError("release manifest has no non-empty schema")
    if schema != "pipelinenews.timestamp-folder-successor.v1" and manifest.get(
        "immutable_after_publication"
    ) is not True:
        raise ClassificationError("release must declare immutable_after_publication: true")
    if schema in PAGES_SCHEMAS:
        return Decision(
            release_id, schema, "pages", "Pages timestamp-folder contract", str(manifest_path),
            hashlib.sha256(raw).hexdigest(), len(raw), manifest.get("deployment"),
        )
    if schema in SOURCE_ONLY_SCHEMAS:
        if manifest.get("deployment") != "not-authorised":
            raise ClassificationError(
                "additive releases must declare deployment: not-authorised"
            )
        parent = manifest.get("parent_release_id")
        if not isinstance(parent, str) or not RELEASE_ID_RE.fullmatch(parent):
            raise ClassificationError("additive release has no valid parent_release_id")
        if parent >= release_id:
            raise ClassificationError("additive release parent must precede its child")
        parent_path = repo / "releases" / parent / "release-manifest.json"
        parent_manifest = _load_manifest(parent_path)
        if parent_manifest.get("release_id") != parent:
            raise ClassificationError("additive release parent identity is invalid")
        return Decision(
            release_id,
            schema,
            "source-only",
            "additive cartridge is validated but not published by Pages",
            str(manifest_path),
            hashlib.sha256(raw).hexdigest(),
            len(raw),
            manifest.get("deployment"),
        )
    raise ClassificationError(f"unsupported release schema: {schema}")


def write_github_output(decision: Decision, path: Path) -> None:
    values = {
        "release_id": decision.release_id,
        "schema": decision.schema,
        "route": decision.route,
        "pages_applicable": str(decision.route == "pages").lower(),
        "manifest_sha256": decision.manifest_sha256,
        "manifest_bytes": str(decision.manifest_bytes),
    }
    with path.open("a", encoding="utf-8", newline="\n") as stream:
        for key, value in values.items():
            if "\n" in value or "\r" in value:
                raise ClassificationError(f"unsafe workflow output value for {key}")
            stream.write(f"{key}={value}\n")


def write_receipt(decision: Decision, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(asdict(decision), indent=2, sort_keys=True) + "\n"
    with tempfile.NamedTemporaryFile(
        "w", encoding="utf-8", newline="\n", dir=path.parent, delete=False
    ) as stream:
        stream.write(payload)
        temporary = Path(stream.name)
    temporary.replace(path)


def resolve_live_pointer(repo: Path) -> str:
    """Resolve the one current pointer that is byte-identical to live-set."""
    live_path = repo / "state" / "live-set.json"
    try:
        live_bytes = live_path.read_bytes()
    except OSError as exc:
        raise ClassificationError(f"cannot read live pointer: {exc}") from exc
    supported = [repo / "releases" / "current-v3.json", repo / "releases" / "current-v4.json"]
    matches = [path for path in supported if path.is_file() and path.read_bytes() == live_bytes]
    if len(matches) != 1:
        raise ClassificationError(
            f"expected one current pointer identical to live-set, found {len(matches)}"
        )
    pointer_path = matches[0]
    pointer = _load_manifest(pointer_path)
    expected_schema = "pipelinenews.live-pointer." + pointer_path.stem.removeprefix("current-")
    if pointer.get("schema") != expected_schema:
        raise ClassificationError("current pointer schema does not match its filename")
    release_id = pointer.get("release_id")
    if not isinstance(release_id, str) or not RELEASE_ID_RE.fullmatch(release_id):
        raise ClassificationError("current pointer has no valid release_id")
    if pointer.get("generation") != release_id[:12]:
        raise ClassificationError("current pointer generation does not match release_id")
    if pointer.get("entrypoint") != f"releases/{release_id}/index.html":
        raise ClassificationError("current pointer entrypoint does not name its release")
    manifest_ref = pointer.get("release_manifest")
    if not isinstance(manifest_ref, dict):
        raise ClassificationError("current pointer has no release_manifest receipt")
    manifest_path = repo / "releases" / release_id / "release-manifest.json"
    manifest_bytes = manifest_path.read_bytes()
    if manifest_ref.get("path") != f"releases/{release_id}/release-manifest.json":
        raise ClassificationError("current pointer manifest path is inconsistent")
    if manifest_ref.get("bytes") != len(manifest_bytes):
        raise ClassificationError("current pointer manifest byte count is stale")
    if manifest_ref.get("sha256") != hashlib.sha256(manifest_bytes).hexdigest():
        raise ClassificationError("current pointer manifest digest is stale")
    if classify_release(repo, release_id).route != "pages":
        raise ClassificationError("current pointer does not target a Pages release class")
    return release_id


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", type=Path, default=Path.cwd())
    parser.add_argument("--release")
    parser.add_argument("--base")
    parser.add_argument("--head")
    parser.add_argument("--allow-pointer-fallback", action="store_true")
    parser.add_argument("--live-pointer", action="store_true")
    parser.add_argument("--github-output", type=Path)
    parser.add_argument("--receipt", type=Path)
    args = parser.parse_args(argv)
    try:
        repo = args.repo.resolve()
        modes = int(args.release is not None) + int(bool(args.base or args.head)) + int(args.live_pointer)
        if modes != 1:
            raise ClassificationError("choose one of --release, --base/--head, or --live-pointer")
        if args.release is not None:
            release_id = args.release
        elif args.live_pointer:
            release_id = resolve_live_pointer(repo)
        else:
            if not args.base or not args.head:
                raise ClassificationError("both --base and --head are required")
            release_id = discover_release(
                repo, args.base, args.head, allow_pointer_fallback=args.allow_pointer_fallback
            )
        decision = classify_release(repo, release_id)
    except ClassificationError as exc:
        parser.error(str(exc))
    if args.github_output:
        write_github_output(decision, args.github_output)
    if args.receipt:
        write_receipt(decision, args.receipt)
    print(json.dumps(asdict(decision), sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
