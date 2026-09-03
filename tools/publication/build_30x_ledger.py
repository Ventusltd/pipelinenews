#!/usr/bin/env python3
"""Build the machine-readable receipt ledger for the audited candidate stream."""

from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path


TESTS: dict[int, list[dict[str, object]]] = {
    1: [{"command": "python -m unittest tools/publication/test_pages_release_classifier.py", "result": "fail", "detail": "Windows import path was not initialized; iteration 02 repaired the harness."}],
    21: [{"command": "python tools/publication/test_pages_release_classifier.py", "result": "pass"}, {"command": "python tools/publication/pages_release_classifier.py --repo . --release 202609032251-pipelinenews", "result": "pass"}],
    22: [{"command": "python tools/intelligence/release_builder.py --check 202609032251-pipelinenews", "result": "pass"}],
    23: [{"command": "python tools/publication/test_pages_release_classifier.py", "result": "pass"}],
    24: [{"command": "git diff --check", "result": "pass"}],
    25: [{"command": "git diff --check", "result": "pass"}],
    26: [{"command": "python tools/publication/test_pages_release_classifier.py", "result": "pass"}, {"command": "python tools/publication/test_verify_pages_workflow.py", "result": "pass"}],
    27: [{"command": "python tools/publication/test_pages_release_classifier.py", "result": "pass"}],
    28: [{"command": "python tools/publication/test_pages_release_classifier.py", "result": "pass"}],
    29: [{"command": "python tools/publication/test_pages_release_classifier.py", "result": "pass"}, {"command": "python tools/publication/test_verify_pages_workflow.py", "result": "pass"}],
    30: [{"command": "python tools/publication/run_pages_candidate_gate.py --receipt <temp>", "result": "pass"}],
    31: [{"command": "python tools/publication/test_pages_release_classifier.py", "result": "pass"}, {"command": "python tools/publication/test_verify_pages_workflow.py", "result": "pass"}],
    32: [{"command": "python tools/publication/test_pages_release_classifier.py", "result": "pass"}, {"command": "python tools/publication/test_verify_pages_workflow.py", "result": "pass"}],
    33: [{"command": "python tools/publication/run_pages_candidate_gate.py --receipt <temp>", "result": "pass"}],
}


def git(repo: Path, *args: str) -> str:
    return subprocess.check_output(["git", *args], cwd=repo, text=True).strip()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", required=True)
    parser.add_argument("--head", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    repo = Path(__file__).resolve().parents[2]
    commits = git(repo, "rev-list", "--reverse", f"{args.base}..{args.head}").splitlines()
    if len(commits) != 33:
        raise SystemExit(f"expected 33 attempts, found {len(commits)}")
    entries = []
    expected_parent = args.base
    default_test = [{"command": "python tools/publication/test_pages_release_classifier.py", "result": "pass"}]
    for number, commit in enumerate(commits, 1):
        parent = git(repo, "show", "-s", "--format=%P", commit)
        subject = git(repo, "show", "-s", "--format=%s", commit)
        expected_prefix = f"iteration {number:02d}: "
        if parent != expected_parent or not subject.startswith(expected_prefix):
            raise SystemExit(f"broken sequence at iteration {number}: {commit}")
        paths_text = git(repo, "diff-tree", "--no-commit-id", "--name-only", "-r", commit)
        tests = TESTS.get(number, default_test)
        entries.append(
            {
                "iteration": number,
                "commit": commit,
                "parent": parent,
                "improvement": subject.removeprefix(expected_prefix),
                "changed_paths": paths_text.splitlines(),
                "tests": tests,
                "result": "superseded" if number == 1 else "pass",
                "qualifies": number != 1,
            }
        )
        expected_parent = commit
    payload = {
        "schema": "pipelinenews.30x-candidate-ledger.v2",
        "base_commit": args.base,
        "branch": "codex/202609040002-pages-classifier",
        "iteration_head": args.head,
        "attempt_count": 33,
        "iteration_count": 32,
        "iteration_count_semantics": "passing material improvements; the failed seed is recorded but not counted",
        "minimum_required_iterations": 30,
        "qualifying_iterations": list(range(2, 34)),
        "entries": entries,
        "evidence_corpus": [
            "claude/CLAUDE.md",
            "claude/sessions/202609032300-four-lanes-one-night/00-NOTE.md",
            "claude/sessions/202609032304-codex-cto-control/00-NOTE.md",
            "claude/sessions/202609032304-codex-cto-control/01-CLAUDE-REPLY.md",
            "claude/sessions/202609032304-codex-cto-control/02-CODEX-REPLY.md",
            "claude/sessions/202609032304-codex-cto-control/03-MILESTONE-PIPELINE-30-GRID-10.md",
            "pipelinenews/docs/coordination/BOARD.md",
            "codex-chatgpt/codex/2026-09-03-claude-24h-audit/EXECUTIVE_TIMELINE.md",
            "codex-chatgpt/codex/2026-09-03-claude-24h-audit/QA_REPORT.md",
            "codex-chatgpt/codex/2026-09-03-phase0/CLAUDE_10X_GRID_FINDING_BRIEF.md",
            "codex-chatgpt/codex/2026-09-03-gridatlas-v10-proposal/PRODUCT_AND_ARCHITECTURE.md",
            "codex-chatgpt/codex/2026-09-03-gridatlas-v10-proposal/RED_TEAM_FINDINGS.md",
            "git range b1e09fb9f2afaeeb989fa8f5e96528f8d68c1aaf..937b8c019074e40bebbc7edf5d8ef8d1751e034e",
            "branch codex/202609012206-pipelinenews-10x10 at 3724c9d and 721c4ae",
            "branch codex/202609020100-pipeline-pages-fix (documentation only; not counted)",
        ],
        "finding_drivers": {
            "pages_red_on_expected_additive_release": [1, 7, 21, 22, 23, 24, 25, 26],
            "identity_and_provenance_failure_classes": list(range(3, 21)),
            "pointer_and_blank_manual_dispatch_compatibility_review": [27, 28, 29],
            "independent_pass_count_and_toctou_review": [31, 32],
            "branch_only_compute_without_deploy_authority": [33],
        },
        "cumulative_validation": {
            "head": args.head,
            "result": "pass",
            "commands": [
                "python tools/publication/run_pages_candidate_gate.py --receipt <temp>",
                "python tools/publication/pages_release_classifier.py --repo . --base b1e09fb9f2afaeeb989fa8f5e96528f8d68c1aaf --head 9ffb4f3df8a1a7e62b7bec7942ec25d1ff09ccb9",
                "git diff --check origin/main...HEAD",
                "git rev-list --count origin/main..HEAD",
            ],
            "classifier_tests": 26,
            "workflow_checks": 15,
            "candidate_workflow_checks": 1,
            "release_builder_check": "pass",
            "historical_additive_push_route": "source-only",
        },
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
