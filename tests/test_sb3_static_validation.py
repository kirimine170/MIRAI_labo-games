from __future__ import annotations

import hashlib
import importlib.util
import json
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = REPOSITORY_ROOT / "tools/scratch-validation/static_validator.py"
SPEC = importlib.util.spec_from_file_location("static_validator", MODULE_PATH)
assert SPEC and SPEC.loader
static_validator = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = static_validator
SPEC.loader.exec_module(static_validator)


class Sb3StaticValidationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def _write_project(self, *, extensions=None, opcode="event_whenflagclicked", corrupt_asset=False):
        asset_data = b"<svg xmlns='http://www.w3.org/2000/svg'/>"
        asset_id = hashlib.md5(asset_data, usedforsecurity=False).hexdigest()
        project = {
            "targets": [{
                "isStage": True,
                "name": "Stage",
                "variables": {},
                "lists": {},
                "broadcasts": {},
                "blocks": {"block": {"opcode": opcode}},
                "costumes": [{
                    "assetId": asset_id,
                    "dataFormat": "svg",
                    "md5ext": f"{asset_id}.svg"
                }],
                "sounds": []
            }],
            "monitors": [],
            "extensions": extensions or []
        }
        archive = self.root / "sample.sb3"
        with zipfile.ZipFile(archive, "w") as output:
            output.writestr("project.json", json.dumps(project))
            output.writestr(f"{asset_id}.svg", b"broken" if corrupt_asset else asset_data)
        return static_validator.validate_archive(archive, "sample", "games/sample")

    def test_minimal_scratch_project_passes(self) -> None:
        result = self._write_project()
        self.assertEqual(result.status, "passed", result.errors)

    def test_asset_md5_mismatch_fails(self) -> None:
        result = self._write_project(corrupt_asset=True)
        self.assertEqual(result.status, "failed")
        self.assertIn("MD5 mismatch", result.errors[0])

    def test_extension_is_rejected(self) -> None:
        result = self._write_project(extensions=["pen"])
        self.assertEqual(result.status, "failed")
        self.assertIn("extensions are forbidden", result.errors[0])

    def test_unknown_opcode_is_rejected(self) -> None:
        result = self._write_project(opcode="motion_not_a_scratch_opcode")
        self.assertEqual(result.status, "failed")
        self.assertIn("opcode is forbidden", result.errors[0])

    def test_parent_traversal_is_rejected(self) -> None:
        archive = self.root / "traversal.sb3"
        with zipfile.ZipFile(archive, "w") as output:
            output.writestr("project.json", "{}")
            output.writestr("../escape", "bad")
        result = static_validator.validate_archive(archive, "sample", "games/sample")
        self.assertEqual(result.status, "failed")
        self.assertIn("traversal", result.errors[0])


if __name__ == "__main__":
    unittest.main()
