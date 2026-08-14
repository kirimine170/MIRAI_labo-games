from __future__ import annotations

import copy
import sys
import unittest
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPOSITORY_ROOT))

from tools.validate_catalog import (  # noqa: E402
    CatalogValidationError,
    load_json,
    validate_catalog,
    validate_instance,
    validate_relationships,
)


class CatalogValidationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.index = load_json(REPOSITORY_ROOT, "catalog/index.json")
        self.games = [load_json(REPOSITORY_ROOT, path) for path in self.index["games"]]
        self.defects = [load_json(REPOSITORY_ROOT, path) for path in self.index["defects"]]
        self.logs = [
            load_json(REPOSITORY_ROOT, path) for path in self.index["log_examples"]
        ]

    def test_repository_catalog_is_valid(self) -> None:
        report = validate_catalog(REPOSITORY_ROOT)

        self.assertEqual(report.games, len(self.index["games"]))
        self.assertEqual(report.defects, len(self.index["defects"]))
        self.assertEqual(report.log_examples, len(self.index["log_examples"]))

    def test_defect_schema_requires_minimal_fix(self) -> None:
        schema = load_json(REPOSITORY_ROOT, "schemas/defect.schema.json")
        malformed = copy.deepcopy(self.defects[0])
        del malformed["repair"]["minimal_fix"]

        with self.assertRaisesRegex(CatalogValidationError, "minimal_fix"):
            validate_instance(malformed, schema)

    def test_log_schema_rejects_direct_identifier_field(self) -> None:
        schema = load_json(REPOSITORY_ROOT, "schemas/session-log.schema.json")
        malformed = copy.deepcopy(self.logs[0])
        malformed["participant_name"] = "\u53ce\u96c6\u3057\u3066\u306f\u3044\u3051\u306a\u3044\u6c0f\u540d"

        with self.assertRaisesRegex(CatalogValidationError, "additional property"):
            validate_instance(malformed, schema)

    def test_unknown_defect_game_is_rejected(self) -> None:
        malformed_defects = copy.deepcopy(self.defects)
        malformed_defects[0]["game_id"] = "99_99"

        with self.assertRaisesRegex(CatalogValidationError, "unknown game_id"):
            validate_relationships(
                REPOSITORY_ROOT,
                self.index,
                self.games,
                malformed_defects,
                self.logs,
            )

    def test_non_monotonic_event_time_is_rejected(self) -> None:
        malformed_logs = copy.deepcopy(self.logs)
        malformed_logs[0]["events"][2]["elapsed_ms"] = 1

        with self.assertRaisesRegex(CatalogValidationError, "elapsed_ms"):
            validate_relationships(
                REPOSITORY_ROOT,
                self.index,
                self.games,
                self.defects,
                malformed_logs,
            )

    def test_defect_needs_a_shared_regression_expectation(self) -> None:
        malformed_defects = copy.deepcopy(self.defects)
        for test in malformed_defects[0]["tests"]:
            if test["kind"] == "regression":
                test["expected_defective"] = "\u56de\u5e30\u30c6\u30b9\u30c8\u3067\u5225\u306e\u7d50\u679c\u306b\u306a\u308b\uff0e"

        with self.assertRaisesRegex(CatalogValidationError, "regression test"):
            validate_relationships(
                REPOSITORY_ROOT,
                self.index,
                self.games,
                malformed_defects,
                self.logs,
            )


if __name__ == "__main__":
    unittest.main()
