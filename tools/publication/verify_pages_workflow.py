#!/usr/bin/env python3
"""Fail when the Pages caller loses its release-routing boundaries."""

from __future__ import annotations

import json
from pathlib import Path


def verify(path: Path) -> dict[str, object]:
    text = path.read_text(encoding="utf-8")
    pre_jobs, jobs = text.split("\njobs:\n", 1)
    checks = {
        "classifier_precedes_routes": jobs.index("  classify:\n") < jobs.index("  deploy:\n"),
        "classifier_emits_receipt": "--receipt reports/pages-release-classification.json" in jobs,
        "source_only_has_own_gate": "if: needs.classify.outputs.route == 'source-only'" in jobs,
        "source_only_runs_release_check": "release_builder.py --check \"$RELEASE_ID\"" in jobs,
        "pages_needs_classifier": "  deploy:\n    needs: classify\n" in jobs,
        "pages_has_job_level_if": "if: needs.classify.outputs.route == 'pages'" in jobs,
        "pages_receives_classified_release": "timestamp_folder_release: ${{ needs.classify.outputs.release_id }}" in jobs,
        "push_preserves_pointer_fallback": "--allow-pointer-fallback" in jobs,
        "manual_preserves_pointer_fallback": "args+=(--live-pointer)" in jobs,
        "global_token_is_read_only": "pages: write" not in pre_jobs and "id-token: write" not in pre_jobs,
        "pages_route_has_write_token": "pages: write\n      id-token: write\n    uses:" in jobs,
    }
    failed = [name for name, passed in checks.items() if not passed]
    receipt = {"schema": "pipelinenews.pages-workflow-proof.v1", "checks": checks, "passed": not failed}
    print(json.dumps(receipt, sort_keys=True))
    if failed:
        raise SystemExit("workflow contract failed: " + ", ".join(failed))
    return receipt


if __name__ == "__main__":
    verify(Path(__file__).resolve().parents[2] / ".github" / "workflows" / "pages.yml")
