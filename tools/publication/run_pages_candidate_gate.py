#!/usr/bin/env python3
"""Run the complete Pages routing gate serially and write a durable receipt."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
import tempfile
from dataclasses import asdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from pages_release_classifier import classify_release


RELEASE_RE = re.compile(r"^[0-9]{12}-pipelinenews$")


def execute(repo: Path, command: list[str]) -> dict[str, object]:
    process = subprocess.run(command, cwd=repo, check=False, capture_output=True)
    sys.stdout.buffer.write(process.stdout)
    sys.stderr.buffer.write(process.stderr)
    combined = process.stdout + process.stderr
    return {
        "command": command,
        "returncode": process.returncode,
        "output_bytes": len(combined),
        "output_sha256": hashlib.sha256(combined).hexdigest(),
    }


def atomic_json(path: Path, payload: dict[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        "w", encoding="utf-8", newline="\n", dir=path.parent, delete=False
    ) as stream:
        json.dump(payload, stream, indent=2, sort_keys=True)
        stream.write("\n")
        temporary = Path(stream.name)
    temporary.replace(path)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", type=Path, default=Path(__file__).resolve().parents[2])
    parser.add_argument("--receipt", type=Path, required=True)
    args = parser.parse_args(argv)
    repo = args.repo.resolve()
    releases = sorted(
        path.name for path in (repo / "releases").iterdir()
        if path.is_dir() and RELEASE_RE.fullmatch(path.name)
    )
    if not releases:
        raise SystemExit("no timestamp release exists")
    latest = releases[-1]
    decision = classify_release(repo, latest)
    python = sys.executable
    commands = [
        [python, "tools/publication/test_pages_release_classifier.py"],
        [python, "tools/publication/test_verify_pages_workflow.py"],
        [python, "tools/publication/test_pages_candidate_workflow.py"],
        [python, "tools/publication/pages_release_classifier.py", "--repo", ".", "--release", latest],
        [python, "tools/publication/pages_release_classifier.py", "--repo", ".", "--live-pointer"],
    ]
    if decision.route == "source-only":
        commands.append([python, "tools/intelligence/release_builder.py", "--check", latest])
    results = []
    for command in commands:
        result = execute(repo, command)
        results.append(result)
        if result["returncode"] != 0:
            break
    head = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=repo, text=True).strip()
    passed = len(results) == len(commands) and all(item["returncode"] == 0 for item in results)
    receipt = {
        "schema": "pipelinenews.pages-candidate-gate.v1",
        "head": head,
        "latest_release": latest,
        "classification": asdict(decision),
        "commands": results,
        "passed": passed,
    }
    atomic_json(args.receipt, receipt)
    print(json.dumps({"passed": passed, "receipt": str(args.receipt), "head": head}, sort_keys=True))
    return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
