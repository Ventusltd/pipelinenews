#!/usr/bin/env python3
from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from verify_pages_workflow import verify


class WorkflowContractTests(unittest.TestCase):
    def test_repository_workflow_keeps_both_routes(self) -> None:
        workflow = Path(__file__).resolve().parents[2] / ".github" / "workflows" / "pages.yml"
        receipt = verify(workflow)
        self.assertTrue(receipt["passed"])
        self.assertGreaterEqual(sum(receipt["checks"].values()), 9)


if __name__ == "__main__":
    unittest.main()
