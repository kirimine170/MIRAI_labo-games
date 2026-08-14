#!/usr/bin/env python3
"""Validate the HackSick Academy catalog without third-party packages.

Run from the repository root with::

    python3 tools/validate_catalog.py

The validator implements the JSON Schema keywords used by ``schemas/*.json`` and
then checks relationships that JSON Schema alone cannot express.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Iterable, Mapping, Sequence


class CatalogValidationError(ValueError):
    """Raised when a schema or cross-document catalog rule is violated."""


@dataclass(frozen=True)
class CatalogReport:
    games: int
    defects: int
    log_examples: int
    schema_files: int


def _json_identity(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def _schema_type_matches(value: Any, expected: str) -> bool:
    if expected == "null":
        return value is None
    if expected == "boolean":
        return isinstance(value, bool)
    if expected == "integer":
        return isinstance(value, int) and not isinstance(value, bool)
    if expected == "number":
        return isinstance(value, (int, float)) and not isinstance(value, bool)
    if expected == "string":
        return isinstance(value, str)
    if expected == "array":
        return isinstance(value, list)
    if expected == "object":
        return isinstance(value, dict)
    raise CatalogValidationError(f"unsupported schema type: {expected}")


def _resolve_local_ref(root_schema: Mapping[str, Any], ref: str) -> Mapping[str, Any]:
    if not ref.startswith("#/"):
        raise CatalogValidationError(f"only local schema references are supported: {ref}")

    current: Any = root_schema
    for raw_token in ref[2:].split("/"):
        token = raw_token.replace("~1", "/").replace("~0", "~")
        if not isinstance(current, Mapping) or token not in current:
            raise CatalogValidationError(f"schema reference does not exist: {ref}")
        current = current[token]
    if not isinstance(current, Mapping):
        raise CatalogValidationError(f"schema reference is not an object: {ref}")
    return current


def _format_is_valid(value: str, format_name: str) -> bool:
    if format_name != "date-time":
        raise CatalogValidationError(f"unsupported schema format: {format_name}")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return False
    return parsed.tzinfo is not None


def validate_instance(
    instance: Any,
    schema: Mapping[str, Any],
    *,
    root_schema: Mapping[str, Any] | None = None,
    location: str = "$",
) -> None:
    """Validate one instance using the JSON Schema subset used in this repository."""

    if root_schema is None:
        root_schema = schema

    if "$ref" in schema:
        validate_instance(
            instance,
            _resolve_local_ref(root_schema, schema["$ref"]),
            root_schema=root_schema,
            location=location,
        )
        return

    if "const" in schema and instance != schema["const"]:
        raise CatalogValidationError(
            f"{location}: expected constant {_json_identity(schema['const'])}"
        )

    if "enum" in schema and instance not in schema["enum"]:
        raise CatalogValidationError(
            f"{location}: {_json_identity(instance)} is not in the allowed values"
        )

    if "type" in schema:
        expected_types = schema["type"]
        if isinstance(expected_types, str):
            expected_types = [expected_types]
        if not any(_schema_type_matches(instance, item) for item in expected_types):
            rendered = ", ".join(expected_types)
            raise CatalogValidationError(f"{location}: expected type {rendered}")

    if isinstance(instance, dict):
        required = schema.get("required", [])
        for key in required:
            if key not in instance:
                raise CatalogValidationError(f"{location}: missing required property {key!r}")

        properties = schema.get("properties", {})
        for key, value in instance.items():
            child_location = f"{location}.{key}"
            if key in properties:
                validate_instance(
                    value,
                    properties[key],
                    root_schema=root_schema,
                    location=child_location,
                )
            elif schema.get("additionalProperties") is False:
                raise CatalogValidationError(f"{child_location}: additional property is forbidden")

    if isinstance(instance, list):
        if len(instance) < schema.get("minItems", 0):
            raise CatalogValidationError(f"{location}: too few items")
        if "maxItems" in schema and len(instance) > schema["maxItems"]:
            raise CatalogValidationError(f"{location}: too many items")
        if schema.get("uniqueItems"):
            identities = [_json_identity(item) for item in instance]
            if len(identities) != len(set(identities)):
                raise CatalogValidationError(f"{location}: duplicate items are forbidden")
        if "items" in schema:
            for index, item in enumerate(instance):
                validate_instance(
                    item,
                    schema["items"],
                    root_schema=root_schema,
                    location=f"{location}[{index}]",
                )

    if isinstance(instance, str):
        if len(instance) < schema.get("minLength", 0):
            raise CatalogValidationError(f"{location}: string is too short")
        if "maxLength" in schema and len(instance) > schema["maxLength"]:
            raise CatalogValidationError(f"{location}: string is too long")
        if "pattern" in schema and re.search(schema["pattern"], instance) is None:
            raise CatalogValidationError(
                f"{location}: value does not match pattern {schema['pattern']!r}"
            )
        if "format" in schema and not _format_is_valid(instance, schema["format"]):
            raise CatalogValidationError(
                f"{location}: value is not a valid {schema['format']} with timezone"
            )

    if isinstance(instance, (int, float)) and not isinstance(instance, bool):
        if "minimum" in schema and instance < schema["minimum"]:
            raise CatalogValidationError(f"{location}: value is below minimum")
        if "maximum" in schema and instance > schema["maximum"]:
            raise CatalogValidationError(f"{location}: value is above maximum")


def _resolve_repository_path(root: Path, relative_path: str) -> Path:
    path = Path(relative_path)
    if path.is_absolute():
        raise CatalogValidationError(f"absolute repository path is forbidden: {relative_path}")
    resolved = (root / path).resolve()
    try:
        resolved.relative_to(root.resolve())
    except ValueError as error:
        raise CatalogValidationError(
            f"repository path escapes the repository: {relative_path}"
        ) from error
    return resolved


def load_json(root: Path, relative_path: str) -> Any:
    path = _resolve_repository_path(root, relative_path)
    if not path.is_file():
        raise CatalogValidationError(f"catalog file does not exist: {relative_path}")
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        raise CatalogValidationError(
            f"invalid JSON in {relative_path}:{error.lineno}:{error.colno}: {error.msg}"
        ) from error


def _assert_unique(values: Iterable[str], description: str) -> None:
    materialized = list(values)
    if len(materialized) != len(set(materialized)):
        raise CatalogValidationError(f"duplicate {description}")


def _validate_source_files(root: Path, game: Mapping[str, Any]) -> None:
    game_id = game["game_id"]
    source = game["source"]
    source_root = _resolve_repository_path(root, source["complete_path"])
    if not source_root.is_dir():
        raise CatalogValidationError(
            f"game {game_id}: complete source directory does not exist: {source['complete_path']}"
        )

    configuration = _resolve_repository_path(root, source["configuration"])
    if not configuration.is_file():
        raise CatalogValidationError(
            f"game {game_id}: configuration does not exist: {source['configuration']}"
        )

    for relative_file in source["files"]:
        source_file = (source_root / relative_file).resolve()
        try:
            source_file.relative_to(source_root)
        except ValueError as error:
            raise CatalogValidationError(
                f"game {game_id}: source file escapes complete_path: {relative_file}"
            ) from error
        if not source_file.is_file():
            raise CatalogValidationError(
                f"game {game_id}: source file does not exist: {relative_file}"
            )

    if game["versions"]["complete"]["source_path"] != source["complete_path"]:
        raise CatalogValidationError(
            f"game {game_id}: complete version source_path must equal source.complete_path"
        )


def validate_relationships(
    root: Path,
    index: Mapping[str, Any],
    games: Sequence[Mapping[str, Any]],
    defects: Sequence[Mapping[str, Any]],
    logs: Sequence[Mapping[str, Any]],
) -> None:
    """Validate IDs, references, lifecycle rules, test intent，and log ordering."""

    _assert_unique((game["game_id"] for game in games), "game_id")
    _assert_unique((defect["defect_id"] for defect in defects), "defect_id")

    game_by_id = {game["game_id"]: game for game in games}
    defect_by_id = {defect["defect_id"]: defect for defect in defects}
    defect_path_by_id = {
        defect["defect_id"]: path for path, defect in zip(index["defects"], defects, strict=True)
    }

    indexed_defect_paths = set(index["defects"])
    referenced_defect_paths: set[str] = set()
    for game in games:
        _validate_source_files(root, game)
        game_id = game["game_id"]
        _assert_unique((test["test_id"] for test in game["tests"]), f"test_id in {game_id}")
        for test in game["tests"]:
            if not test["test_id"].startswith(f"{game_id}-"):
                raise CatalogValidationError(
                    f"game {game_id}: test_id has the wrong game prefix: {test['test_id']}"
                )
        referenced_defect_paths.update(game["versions"]["defect_manifests"])

    if referenced_defect_paths != indexed_defect_paths:
        missing_from_games = indexed_defect_paths - referenced_defect_paths
        missing_from_index = referenced_defect_paths - indexed_defect_paths
        raise CatalogValidationError(
            "game defect references and catalog index differ: "
            f"unreferenced={sorted(missing_from_games)}, unindexed={sorted(missing_from_index)}"
        )

    for defect in defects:
        defect_id = defect["defect_id"]
        game_id = defect["game_id"]
        if game_id not in game_by_id:
            raise CatalogValidationError(f"defect {defect_id}: unknown game_id {game_id}")
        if not defect_id.startswith(f"{game_id}-"):
            raise CatalogValidationError(
                f"defect {defect_id}: defect_id does not match game_id {game_id}"
            )

        game = game_by_id[game_id]
        if defect_path_by_id[defect_id] not in game["versions"]["defect_manifests"]:
            raise CatalogValidationError(
                f"defect {defect_id}: owning game does not reference its manifest"
            )

        game_grades = set(game["target_learners"]["grades"])
        defect_grades = set(defect["target_learners"]["grades"])
        if not defect_grades.issubset(game_grades):
            raise CatalogValidationError(
                f"defect {defect_id}: target grades must be a subset of the game's grades"
            )

        game_concepts = {concept["id"] for concept in game["learning"]["primary_concepts"]}
        primary_concept = defect["learning"]["primary_concept"]["id"]
        if primary_concept not in game_concepts:
            raise CatalogValidationError(
                f"defect {defect_id}: primary concept is not declared by game {game_id}"
            )

        complete = defect["versions"]["complete"]
        game_complete = game["versions"]["complete"]
        if complete["version"] != game_complete["version"]:
            raise CatalogValidationError(
                f"defect {defect_id}: complete version differs from game {game_id}"
            )
        if complete["source_path"] != game_complete["source_path"]:
            raise CatalogValidationError(
                f"defect {defect_id}: complete source differs from game {game_id}"
            )

        defective = defect["versions"]["defective"]
        if defect["lifecycle"] == "planned" and defective["delivery"] != "planned_patch":
            raise CatalogValidationError(
                f"defect {defect_id}: a planned defect must use planned_patch delivery"
            )
        if defect["lifecycle"] in {"implemented", "validated"} and defective["delivery"] == "planned_patch":
            raise CatalogValidationError(
                f"defect {defect_id}: implemented defect cannot use planned_patch delivery"
            )
        for patch_target in defective["patch_targets"]:
            if not _resolve_repository_path(root, patch_target).is_file():
                raise CatalogValidationError(
                    f"defect {defect_id}: patch target does not exist: {patch_target}"
                )

        for edit_target in defect["repair"]["minimal_fix"]["edit_targets"]:
            edit_path = _resolve_repository_path(root, edit_target["path"])
            if not edit_path.is_file():
                raise CatalogValidationError(
                    f"defect {defect_id}: edit target does not exist: {edit_target['path']}"
                )
            if edit_target["anchor"] not in edit_path.read_text(encoding="utf-8"):
                raise CatalogValidationError(
                    f"defect {defect_id}: repair anchor is not present in "
                    f"{edit_target['path']}: {edit_target['anchor']}"
                )

        steps = defect["reproduction"]["steps"]
        if [step["step"] for step in steps] != list(range(1, len(steps) + 1)):
            raise CatalogValidationError(
                f"defect {defect_id}: reproduction steps must be consecutive from 1"
            )

        hint_levels = [hint["level"] for hint in defect["hints"]]
        if hint_levels != list(range(1, len(hint_levels) + 1)):
            raise CatalogValidationError(
                f"defect {defect_id}: hint levels must be consecutive from 1"
            )
        if defect["hints"][0]["focus"] != "observation":
            raise CatalogValidationError(
                f"defect {defect_id}: the first hint must focus on observation"
            )

        _assert_unique((test["test_id"] for test in defect["tests"]), f"test_id in {defect_id}")
        for test in defect["tests"]:
            if not test["test_id"].startswith(f"{defect_id}-"):
                raise CatalogValidationError(
                    f"defect {defect_id}: test_id has the wrong defect prefix: {test['test_id']}"
                )
        if not any(
            test["kind"] in {"symptom", "boundary"}
            and test["expected_complete"] != test["expected_defective"]
            for test in defect["tests"]
        ):
            raise CatalogValidationError(
                f"defect {defect_id}: tests do not distinguish complete and defective versions"
            )
        if not any(
            test["kind"] == "regression"
            and test["expected_complete"] == test["expected_defective"]
            for test in defect["tests"]
        ):
            raise CatalogValidationError(
                f"defect {defect_id}: add a regression test that both versions should satisfy"
            )

    for log_index, log in enumerate(logs):
        context = f"log example {log_index + 1} ({log['session_id']})"
        game_id = log["game_id"]
        if game_id not in game_by_id:
            raise CatalogValidationError(f"{context}: unknown game_id {game_id}")

        defect_id = log["defect_id"]
        if log["variant"] == "defective":
            if defect_id is None or defect_id not in defect_by_id:
                raise CatalogValidationError(
                    f"{context}: defective variant requires a known defect_id"
                )
            if defect_by_id[defect_id]["game_id"] != game_id:
                raise CatalogValidationError(
                    f"{context}: defect_id does not belong to game_id {game_id}"
                )
        elif defect_id is not None:
            raise CatalogValidationError(
                f"{context}: complete and no-defect variants must have a null defect_id"
            )

        events = log["events"]
        sequences = [event["sequence"] for event in events]
        if sequences != list(range(1, len(events) + 1)):
            raise CatalogValidationError(
                f"{context}: event sequences must be consecutive from 1"
            )
        elapsed = [event["elapsed_ms"] for event in events]
        if elapsed != sorted(elapsed):
            raise CatalogValidationError(f"{context}: elapsed_ms must be monotonic")


def validate_catalog(root: Path) -> CatalogReport:
    root = root.resolve()
    catalog_schema = load_json(root, "schemas/catalog.schema.json")
    index = load_json(root, "catalog/index.json")
    validate_instance(index, catalog_schema)

    game_schema = load_json(root, index["schemas"]["game"])
    defect_schema = load_json(root, index["schemas"]["defect"])
    log_schema = load_json(root, index["schemas"]["session_log"])

    games = [load_json(root, path) for path in index["games"]]
    defects = [load_json(root, path) for path in index["defects"]]
    logs = [load_json(root, path) for path in index["log_examples"]]

    for path, game in zip(index["games"], games, strict=True):
        validate_instance(game, game_schema, location=path)
    for path, defect in zip(index["defects"], defects, strict=True):
        validate_instance(defect, defect_schema, location=path)
    for path, log in zip(index["log_examples"], logs, strict=True):
        validate_instance(log, log_schema, location=path)

    validate_relationships(root, index, games, defects, logs)
    return CatalogReport(
        games=len(games),
        defects=len(defects),
        log_examples=len(logs),
        schema_files=4,
    )


def _default_repository_root() -> Path:
    return Path(__file__).resolve().parents[1]


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--root",
        type=Path,
        default=_default_repository_root(),
        help="repository root（defaults to the parent of tools/）",
    )
    args = parser.parse_args(argv)

    try:
        report = validate_catalog(args.root)
    except CatalogValidationError as error:
        print(f"catalog validation failed: {error}", file=sys.stderr)
        return 1

    print(
        "catalog validation passed: "
        f"{report.games} games, {report.defects} defects, "
        f"{report.log_examples} log examples, {report.schema_files} schemas"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
