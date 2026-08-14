#!/usr/bin/env python3
"""Manage per-game Semantic Versions and release metadata."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable, Mapping, Sequence


SEMVER_PATTERN = re.compile(
    r"^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$"
)


class VersionPolicyError(ValueError):
    """Raised when catalog versions violate the release policy."""


@dataclass(frozen=True, order=True)
class SemVer:
    major: int
    minor: int
    patch: int

    @classmethod
    def parse(cls, value: str) -> "SemVer":
        match = SEMVER_PATTERN.fullmatch(value)
        if match is None:
            raise VersionPolicyError(
                f"invalid Semantic Version {value!r}; expected MAJOR.MINOR.PATCH"
            )
        return cls(*(int(part) for part in match.groups()))

    def bump(self, part: str) -> "SemVer":
        if part == "major":
            return SemVer(self.major + 1, 0, 0)
        if part == "minor":
            return SemVer(self.major, self.minor + 1, 0)
        if part == "patch":
            return SemVer(self.major, self.minor, self.patch + 1)
        raise VersionPolicyError(f"unknown version component: {part}")

    def __str__(self) -> str:
        return f"{self.major}.{self.minor}.{self.patch}"


def _run_git(root: Path, *args: str) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=root,
        check=False,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if result.returncode != 0:
        raise VersionPolicyError(result.stderr.strip() or "git command failed")
    return result.stdout


def _load_worktree_json(root: Path, relative_path: str) -> Mapping[str, Any]:
    return json.loads((root / relative_path).read_text(encoding="utf-8"))


def _load_ref_json(root: Path, ref: str, relative_path: str) -> Mapping[str, Any]:
    raw = _run_git(root, "show", f"{ref}:{relative_path}")
    return json.loads(raw)


def load_games(root: Path, ref: str | None = None) -> dict[str, dict[str, Any]]:
    loader = (
        (lambda path: _load_ref_json(root, ref, path))
        if ref is not None
        else (lambda path: _load_worktree_json(root, path))
    )
    index = loader("catalog/index.json")
    games: dict[str, dict[str, Any]] = {}
    for manifest_path in index["games"]:
        game = dict(loader(manifest_path))
        game["_manifest_path"] = manifest_path
        games[game["game_id"]] = game
    return games


def release_affecting_game_ids(
    games: Mapping[str, Mapping[str, Any]], changed_paths: Iterable[str]
) -> set[str]:
    """Return games whose compiled complete-version inputs changed."""

    changed = tuple(changed_paths)
    affected: set[str] = set()
    for game_id, game in games.items():
        source_path = game["source"]["complete_path"].rstrip("/")
        prefix = f"{source_path}/"
        for path in changed:
            if not path.startswith(prefix):
                continue
            relative = path[len(prefix) :]
            if relative.startswith("defects/"):
                continue
            if relative in {".gitignore", "assets/manifest.json"}:
                continue
            affected.add(game_id)
            break
    return affected


def validate_version_bumps(
    base_games: Mapping[str, Mapping[str, Any]],
    current_games: Mapping[str, Mapping[str, Any]],
    changed_paths: Iterable[str],
) -> list[str]:
    """Validate version increases for changed compiled game inputs."""

    affected = release_affecting_game_ids(current_games, changed_paths)
    messages: list[str] = []
    for game_id, game in sorted(current_games.items()):
        current = SemVer.parse(game["versions"]["complete"]["version"])
        if game_id not in affected:
            continue
        if game_id not in base_games:
            if current < SemVer(1, 0, 0):
                raise VersionPolicyError(
                    f"{game_id}: a new releasable game must start at 1.0.0 or later"
                )
            messages.append(f"{game_id}: new game version {current}")
            continue
        previous = SemVer.parse(
            base_games[game_id]["versions"]["complete"]["version"]
        )
        if current <= previous:
            raise VersionPolicyError(
                f"{game_id}: compiled inputs changed but version did not increase "
                f"({previous} -> {current})"
            )
        messages.append(f"{game_id}: version increased {previous} -> {current}")
    return messages


def _replace_once(path: Path, old: str, new: str) -> str:
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise VersionPolicyError(
            f"{path}: expected exactly one occurrence of {old!r}, found {count}"
        )
    return text.replace(old, new, 1)


def bump_game(root: Path, game_id: str, part: str, *, dry_run: bool = False) -> SemVer:
    games = load_games(root)
    if game_id not in games:
        raise VersionPolicyError(f"unknown game_id: {game_id}")
    game = games[game_id]
    current = SemVer.parse(game["versions"]["complete"]["version"])
    updated = current.bump(part)
    replacements: dict[Path, str] = {}

    game_path = root / game["_manifest_path"]
    replacements[game_path] = _replace_once(
        game_path,
        f'"version": "{current}"',
        f'"version": "{updated}"',
    )

    for defect_manifest in game["versions"]["defect_manifests"]:
        defect_path = root / defect_manifest
        defect_text = _replace_once(
            defect_path,
            f'"version": "{current}"',
            f'"version": "{updated}"',
        )
        base_old = f'"base_version": "{current}"'
        base_new = f'"base_version": "{updated}"'
        count = defect_text.count(base_old)
        if count != 1:
            raise VersionPolicyError(
                f"{defect_path}: expected exactly one occurrence of {base_old!r}, "
                f"found {count}"
            )
        replacements[defect_path] = defect_text.replace(base_old, base_new, 1)

    if not dry_run:
        for path, text in replacements.items():
            path.write_text(text, encoding="utf-8")
    return updated


def release_rows(games: Mapping[str, Mapping[str, Any]]) -> list[tuple[str, str, str, str]]:
    rows: list[tuple[str, str, str, str]] = []
    artifact_names: set[str] = set()
    for game_id, game in sorted(games.items()):
        if game["lifecycle"] != "complete":
            continue
        version = str(SemVer.parse(game["versions"]["complete"]["version"]))
        slug = game["slug"]
        artifact_name = f"{game_id}-{slug}-v{version}.sb3"
        if artifact_name in artifact_names:
            raise VersionPolicyError(f"duplicate release artifact: {artifact_name}")
        artifact_names.add(artifact_name)
        rows.append((game_id, version, slug, game["source"]["complete_path"]))
    return rows


def write_release_metadata(root: Path, output_dir: Path, bundle_version: str) -> None:
    bundle = SemVer.parse(bundle_version)
    games = load_games(root)
    artifacts: list[dict[str, str]] = []
    checksum_lines: list[str] = []
    for game_id, version, slug, _ in release_rows(games):
        filename = f"{game_id}-{slug}-v{version}.sb3"
        artifact_path = output_dir / filename
        if not artifact_path.is_file():
            raise VersionPolicyError(f"missing release artifact: {filename}")
        digest = hashlib.sha256(artifact_path.read_bytes()).hexdigest()
        artifacts.append(
            {
                "game_id": game_id,
                "slug": slug,
                "version": version,
                "file": filename,
                "sha256": digest,
            }
        )
        checksum_lines.append(f"{digest}  {filename}")

    manifest = {
        "schema_version": "1.0.0",
        "bundle_version": str(bundle),
        "git_commit": _run_git(root, "rev-parse", "HEAD").strip(),
        "artifacts": artifacts,
    }
    (output_dir / "release-manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    (output_dir / "SHA256SUMS").write_text(
        "\n".join(checksum_lines) + "\n", encoding="utf-8"
    )


def _repository_root() -> Path:
    return Path(__file__).resolve().parents[1]


def _changed_paths(root: Path, base_ref: str) -> list[str]:
    output = _run_git(root, "diff", "--name-only", "--diff-filter=ACMR", base_ref, "HEAD")
    return [line for line in output.splitlines() if line]


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=_repository_root())
    subparsers = parser.add_subparsers(dest="command", required=True)

    check_parser = subparsers.add_parser("check", help="check version bumps since a Git ref")
    check_parser.add_argument("base_ref")

    bump_parser = subparsers.add_parser("bump", help="bump one game's version")
    bump_parser.add_argument("game_id")
    bump_parser.add_argument("part", choices=("major", "minor", "patch"))
    bump_parser.add_argument("--dry-run", action="store_true")

    subparsers.add_parser("release-list", help="print release projects as TSV")

    manifest_parser = subparsers.add_parser(
        "release-manifest", help="write checksums and release-manifest.json"
    )
    manifest_parser.add_argument("output_dir", type=Path)
    manifest_parser.add_argument("bundle_version")

    ready_parser = subparsers.add_parser(
        "release-ready", help="check release versions and optional stable status"
    )
    ready_parser.add_argument("--stable", action="store_true")

    args = parser.parse_args(argv)
    root = args.root.resolve()
    try:
        if args.command == "check":
            current_games = load_games(root)
            base_games = load_games(root, args.base_ref)
            messages = validate_version_bumps(
                base_games, current_games, _changed_paths(root, args.base_ref)
            )
            print("game version policy passed")
            for message in messages:
                print(message)
        elif args.command == "bump":
            updated = bump_game(root, args.game_id, args.part, dry_run=args.dry_run)
            action = "would update" if args.dry_run else "updated"
            print(f"{action} {args.game_id} to {updated}")
        elif args.command == "release-list":
            for row in release_rows(load_games(root)):
                print("\t".join(row))
        elif args.command == "release-manifest":
            write_release_metadata(root, args.output_dir.resolve(), args.bundle_version)
            print(f"release metadata written to {args.output_dir}")
        elif args.command == "release-ready":
            games = load_games(root)
            release_rows(games)
            if args.stable:
                if not (root / "LICENSE").is_file():
                    raise VersionPolicyError(
                        "stable release requires a repository LICENSE file"
                    )
                unverified = sorted(
                    game_id
                    for game_id, game in games.items()
                    if game["lifecycle"] == "complete"
                    and game["versions"]["complete"]["status"] != "verified"
                )
                if unverified:
                    raise VersionPolicyError(
                        "stable release requires verified games: " + ", ".join(unverified)
                    )
            print("release version policy passed")
    except (OSError, json.JSONDecodeError, VersionPolicyError) as error:
        print(f"version policy failed: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
