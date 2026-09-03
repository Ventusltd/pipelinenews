#!/usr/bin/env python3
from __future__ import annotations

import unittest
from pathlib import Path


class CandidateWorkflowTests(unittest.TestCase):
    def test_candidate_has_compute_without_publish_authority(self) -> None:
        path = Path(__file__).resolve().parents[2] / ".github" / "workflows" / "202609040100-pages-routing-candidate.yml"
        source = path.read_text(encoding="utf-8")
        trigger = source.split("\npermissions:\n", 1)[0]
        permissions = source.split("\npermissions:\n", 1)[1].split("\nconcurrency:\n", 1)[0]
        self.assertIn("workflow_dispatch:", trigger)
        self.assertIn("pull_request:", trigger)
        self.assertIn("push:", trigger)
        push = trigger.split("  push:\n", 1)[1].split("  pull_request:\n", 1)[0]
        self.assertIn("branches:\n      - main", push)
        self.assertIn(".github/workflows/202609040100-pages-routing-candidate.yml", push)
        self.assertIn("tools/publication/**", push)
        self.assertNotIn("schedule:", trigger)
        self.assertEqual(permissions.strip(), "contents: read")
        self.assertIn("cancel-in-progress: true", source)
        self.assertIn("run_pages_candidate_gate.py", source)
        self.assertIn("actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02", source)
        self.assertNotIn("actions/deploy-pages", source)


if __name__ == "__main__":
    unittest.main()
