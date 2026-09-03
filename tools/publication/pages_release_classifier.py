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


def _load_manifest(path: Path) -> dict[str, Any]:
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
        if path.stat().st_size > MAX_MANIFEST_BYTES:
            raise ClassificationError("release manifest exceeds 1 MiB limit")
        value = json.loads(
            path.read_text(encoding="utf-8"), object_pairs_hook=reject_duplicates
        )
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise ClassificationError(f"cannot read manifest {path}: {exc}") from exc
    if not isinstance(value, dict):
        raise ClassificationError("release manifest must be a JSON object")
    return value


def classify_release(repo: Path, release_id: str) -> Decision:
    if not RELEASE_ID_RE.fullmatch(release_id):
        raise ClassificationError(f"invalid release id: {release_id!r}")
    manifest_path = repo / "releases" / release_id / "release-manifest.json"
    manifest = _load_manifest(manifest_path)
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
        raw = manifest_path.read_bytes()
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
        raw = manifest_path.read_bytes()
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


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", type=Path, default=Path.cwd())
    parser.add_argument("--release", required=True)
    parser.add_argument("--github-output", type=Path)
    parser.add_argument("--receipt", type=Path)
    args = parser.parse_args(argv)
    try:
        decision = classify_release(args.repo.resolve(), args.release)
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
