from __future__ import annotations

import unittest

from tools.game_versions import (
    SemVer,
    VersionPolicyError,
    release_affecting_game_ids,
    validate_version_bumps,
)


def game(version: str, source_path: str = "games/example") -> dict:
    return {
        "source": {"complete_path": source_path},
        "versions": {"complete": {"version": version}},
    }


class GameVersionTests(unittest.TestCase):
    def test_semver_components_reset_lower_parts(self) -> None:
        current = SemVer.parse("1.2.3")

        self.assertEqual(str(current.bump("major")), "2.0.0")
        self.assertEqual(str(current.bump("minor")), "1.3.0")
        self.assertEqual(str(current.bump("patch")), "1.2.4")

    def test_semver_rejects_leading_zero(self) -> None:
        with self.assertRaisesRegex(VersionPolicyError, "Semantic Version"):
            SemVer.parse("1.01.0")

    def test_runtime_source_change_requires_version_increase(self) -> None:
        base = {"00_99": game("1.0.0")}
        current = {"00_99": game("1.0.0")}

        with self.assertRaisesRegex(VersionPolicyError, "did not increase"):
            validate_version_bumps(base, current, ["games/example/stage.gs"])

    def test_minor_increase_accepts_runtime_source_change(self) -> None:
        base = {"00_99": game("1.0.0")}
        current = {"00_99": game("1.1.0")}

        messages = validate_version_bumps(base, current, ["games/example/stage.gs"])

        self.assertEqual(messages, ["00_99: version increased 1.0.0 -> 1.1.0"])

    def test_teacher_only_patch_does_not_change_complete_artifact(self) -> None:
        games = {"00_99": game("1.0.0")}

        affected = release_affecting_game_ids(
            games, ["games/example/defects/00_99-D01.patch"]
        )

        self.assertEqual(affected, set())


if __name__ == "__main__":
    unittest.main()
