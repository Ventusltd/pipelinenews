#!/usr/bin/env python3
"""Patch the Pages gate to attest historical compiler inputs for timestamp releases."""

from pathlib import Path

TARGET = Path("atman/202608262014-build-pages.py")


def replace_once(text: str, before: str, after: str, label: str) -> str:
    count = text.count(before)
    if count != 1:
        raise RuntimeError(f"{label}: expected one anchor, found {count}")
    return text.replace(before, after)


def main() -> None:
    text = TARGET.read_text(encoding="utf-8")

    verify_anchor = '''def verify_record(root: Path, record: dict, label: str) -> Path:
    relative = record.get("path")
    require(isinstance(relative, str) and relative, f"{label} has no path")
    target = repository_path(root, relative)
    require(target.is_file(), f"missing {label}: {relative}")
    require(target.stat().st_size == record.get("bytes"), f"byte mismatch for {relative}")
    require(sha256(target) == record.get("sha256"), f"SHA-256 mismatch for {relative}")
    return target
'''
    helper = verify_anchor + '''

def verify_record_at_commit(root: Path, commit: str, record: dict, label: str) -> None:
    relative = record.get("path")
    require(isinstance(relative, str) and relative, f"{label} has no path")
    completed = subprocess.run(
        ["git", "show", f"{commit}:{relative}"],
        cwd=root,
        check=True,
        capture_output=True,
    )
    payload = completed.stdout
    expected_bytes = record.get("bytes")
    if expected_bytes is not None:
        require(len(payload) == expected_bytes, f"historical byte mismatch for {relative}")
    require(
        hashlib.sha256(payload).hexdigest() == record.get("sha256"),
        f"historical SHA-256 mismatch for {relative}",
    )
'''
    text = replace_once(text, verify_anchor, helper, "verify_record")

    text = replace_once(
        text,
        "def validate_release(root: Path, requested: str) -> dict:\n",
        "def validate_release(root: Path, requested: str, *, replay_sources: bool = True) -> dict:\n",
        "validate_release signature",
    )

    old_validation = '''    seen: set[str] = set()
    for record in manifest["inputs"]:
        require(record["path"] not in seen, f"duplicate manifest path: {record['path']}")
        seen.add(record["path"])
        verify_record(root, record, "input")
    for record in manifest["outputs"]:
        require(record["path"] not in seen, f"duplicate manifest path: {record['path']}")
        seen.add(record["path"])
        verify_record(root, record, "output")
    require(manifest_path.is_file(), "release manifest disappeared")

    compiler_result = run_compiler(root, manifest, generation)
'''
    new_validation = '''    manifest_commit = git_text(root, "log", "-1", "--format=%H", "--", manifest_path.relative_to(root).as_posix())
    require(bool(COMMIT_RE.fullmatch(manifest_commit)), "compiled release manifest is not committed")

    seen: set[str] = set()
    for record in manifest["inputs"]:
        require(record["path"] not in seen, f"duplicate manifest path: {record['path']}")
        seen.add(record["path"])
        if replay_sources or record["path"].startswith("data/"):
            verify_record(root, record, "input")
        else:
            verify_record_at_commit(root, manifest_commit, record, "historical input")
    for record in manifest["outputs"]:
        require(record["path"] not in seen, f"duplicate manifest path: {record['path']}")
        seen.add(record["path"])
        verify_record(root, record, "output")
    require(manifest_path.is_file(), "release manifest disappeared")

    if replay_sources:
        compiler_result = run_compiler(root, manifest, generation)
    else:
        verify_record_at_commit(root, manifest_commit, manifest["compiler"], "historical compiler")
        compiler_result = {
            "generation": f"{generation}-index",
            "status": "HISTORICAL_SOURCE_ATTESTED",
            "manifest_commit": manifest_commit,
        }
'''
    text = replace_once(text, old_validation, new_validation, "compiled validation block")

    text = replace_once(
        text,
        "    release = validate_release(root, args.generation)\n",
        "    release = validate_release(root, args.generation, replay_sources=not bool(args.timestamp_folder_release))\n",
        "main validation call",
    )

    TARGET.write_text(text, encoding="utf-8", newline="\n")


if __name__ == "__main__":
    main()
