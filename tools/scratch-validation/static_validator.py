#!/usr/bin/env python3
"""Validate generated Scratch 3 archives without extracting untrusted paths."""

from __future__ import annotations

import argparse
import hashlib
import json
import stat
import sys
import zipfile
from dataclasses import asdict, dataclass
from pathlib import Path, PurePosixPath
from typing import Any
from xml.etree import ElementTree


MAX_ENTRIES = 4096
MAX_ENTRY_SIZE = 64 * 1024 * 1024
MAX_TOTAL_SIZE = 256 * 1024 * 1024
MAX_COMPRESSION_RATIO = 200
STANDARD_OPCODES = frozenset(
    """
    argument_reporter_boolean argument_reporter_string_number
    control_all_at_once control_clear_counter control_create_clone_of
    control_create_clone_of_menu control_delete_this_clone control_for_each
    control_forever control_get_counter control_if control_if_else
    control_incr_counter control_repeat control_repeat_until
    control_start_as_clone control_stop control_wait control_wait_until
    control_while
    data_addtolist data_changevariableby data_deletealloflist
    data_deleteoflist data_hidelist data_hidevariable data_insertatlist
    data_itemnumoflist data_itemoflist data_lengthoflist
    data_listcontainsitem data_listcontents data_replaceitemoflist
    data_setvariableto data_showlist data_showvariable data_variable
    event_broadcast event_broadcast_menu event_broadcastandwait
    event_whenbackdropswitchesto event_whenbroadcastreceived
    event_whenflagclicked event_whengreaterthan event_whenkeypressed
    event_whenstageclicked event_whenthisspriteclicked
    event_whentouchingobject
    looks_backdropnumbername looks_backdrops looks_changeeffectby
    looks_changesizeby looks_changestretchby looks_cleargraphiceffects
    looks_costume looks_costumenumbername looks_goforwardbackwardlayers
    looks_gotofrontback looks_hide looks_hideallsprites looks_nextbackdrop
    looks_nextcostume looks_say looks_sayforsecs looks_seteffectto
    looks_setsizeto looks_setstretchto looks_show looks_size
    looks_switchbackdropto looks_switchbackdroptoandwait
    looks_switchcostumeto looks_think looks_thinkforsecs
    motion_align_scene motion_changexby motion_changeyby motion_direction
    motion_glidesecstoxy motion_glideto motion_glideto_menu motion_goto
    motion_goto_menu motion_gotoxy motion_ifonedgebounce motion_movesteps
    motion_pointindirection motion_pointtowards motion_pointtowards_menu
    motion_scroll_right motion_scroll_up motion_setrotationstyle motion_setx
    motion_sety motion_turnleft motion_turnright motion_xposition
    motion_xscroll motion_yposition motion_yscroll
    operator_add operator_and operator_contains operator_divide
    operator_equals operator_gt operator_join operator_length
    operator_letter_of operator_lt operator_mathop operator_mod
    operator_multiply operator_not operator_or operator_random
    operator_round operator_subtract
    procedures_call procedures_definition procedures_prototype
    sensing_answer sensing_askandwait sensing_coloristouchingcolor
    sensing_current sensing_dayssince2000 sensing_distanceto
    sensing_distancetomenu sensing_keyoptions sensing_keypressed sensing_loud
    sensing_loudness sensing_mousedown sensing_mousex sensing_mousey
    sensing_of sensing_of_object_menu sensing_online sensing_resettimer
    sensing_setdragmode sensing_timer sensing_touchingcolor
    sensing_touchingobject sensing_touchingobjectmenu sensing_userid
    sensing_username
    sound_beats_menu sound_changeeffectby sound_changevolumeby
    sound_cleareffects sound_effects_menu sound_play sound_playuntildone
    sound_seteffectto sound_setvolumeto sound_sounds_menu sound_stopallsounds
    sound_volume
    """.split()
)


class ValidationError(ValueError):
    pass


@dataclass
class Result:
    game: str
    project: str
    archive: str
    status: str
    checks: int
    errors: list[str]


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise ValidationError(message)


def _safe_archive_members(archive: zipfile.ZipFile) -> dict[str, zipfile.ZipInfo]:
    infos = archive.infolist()
    _require(len(infos) <= MAX_ENTRIES, f"ZIP has too many entries: {len(infos)}")
    names: dict[str, zipfile.ZipInfo] = {}
    total_size = 0
    for info in infos:
        path = PurePosixPath(info.filename)
        _require(not path.is_absolute(), f"absolute ZIP entry is forbidden: {info.filename}")
        _require(".." not in path.parts, f"parent traversal is forbidden: {info.filename}")
        _require(info.filename not in names, f"duplicate ZIP entry: {info.filename}")
        mode = info.external_attr >> 16
        _require(not stat.S_ISLNK(mode), f"symbolic link is forbidden: {info.filename}")
        _require(info.file_size <= MAX_ENTRY_SIZE, f"ZIP entry is too large: {info.filename}")
        total_size += info.file_size
        _require(total_size <= MAX_TOTAL_SIZE, "ZIP uncompressed size is too large")
        if info.file_size and info.compress_size:
            ratio = info.file_size / info.compress_size
            _require(ratio <= MAX_COMPRESSION_RATIO, f"suspicious ZIP ratio: {info.filename}")
        names[info.filename] = info
    return names


def _validate_asset(
    archive: zipfile.ZipFile,
    members: dict[str, zipfile.ZipInfo],
    asset: Any,
    context: str,
) -> int:
    _require(isinstance(asset, dict), f"{context} must be an object")
    asset_id = asset.get("assetId")
    data_format = asset.get("dataFormat")
    md5ext = asset.get("md5ext")
    _require(isinstance(asset_id, str) and len(asset_id) == 32, f"{context}.assetId is invalid")
    _require(isinstance(data_format, str) and data_format, f"{context}.dataFormat is invalid")
    _require(isinstance(md5ext, str), f"{context}.md5ext is missing")
    _require(md5ext == f"{asset_id}.{data_format}", f"{context}.md5ext disagrees with assetId/dataFormat")
    _require(md5ext in members, f"{context} references missing asset {md5ext}")
    digest = hashlib.md5(archive.read(md5ext), usedforsecurity=False).hexdigest()
    _require(digest == asset_id, f"{context} MD5 mismatch for {md5ext}")
    return 5


def validate_archive(path: Path, game: str, project: str) -> Result:
    checks = 0
    errors: list[str] = []
    try:
        _require(path.is_file(), f"archive does not exist: {path}")
        _require(path.suffix == ".sb3", f"archive must end in .sb3: {path}")
        _require(zipfile.is_zipfile(path), f"not a ZIP archive: {path}")
        checks += 3
        with zipfile.ZipFile(path) as archive:
            bad_member = archive.testzip()
            _require(bad_member is None, f"ZIP CRC failure: {bad_member}")
            members = _safe_archive_members(archive)
            _require("project.json" in members, "project.json is missing")
            checks += 3
            try:
                project_data = json.loads(archive.read("project.json"))
            except (UnicodeDecodeError, json.JSONDecodeError) as error:
                raise ValidationError(f"project.json is invalid: {error}") from error

            _require(isinstance(project_data, dict), "project.json root must be an object")
            targets = project_data.get("targets")
            _require(isinstance(targets, list) and targets, "targets must be a non-empty array")
            stages = [target for target in targets if isinstance(target, dict) and target.get("isStage") is True]
            _require(len(stages) == 1, f"project must contain exactly one Stage, found {len(stages)}")
            _require(isinstance(project_data.get("monitors", []), list), "monitors must be an array")
            extensions = project_data.get("extensions", [])
            _require(extensions == [], f"custom or TurboWarp extensions are forbidden: {extensions!r}")
            checks += 5

            for target_index, target in enumerate(targets):
                context = f"targets[{target_index}]"
                _require(isinstance(target, dict), f"{context} must be an object")
                _require(isinstance(target.get("name"), str) and target["name"], f"{context}.name is invalid")
                _require(isinstance(target.get("variables", {}), dict), f"{context}.variables must be an object")
                _require(isinstance(target.get("lists", {}), dict), f"{context}.lists must be an object")
                _require(isinstance(target.get("broadcasts", {}), dict), f"{context}.broadcasts must be an object")
                blocks = target.get("blocks")
                _require(isinstance(blocks, dict), f"{context}.blocks must be an object")
                costumes = target.get("costumes")
                sounds = target.get("sounds")
                _require(isinstance(costumes, list) and costumes, f"{context}.costumes must be non-empty")
                _require(isinstance(sounds, list), f"{context}.sounds must be an array")
                checks += 8

                for block_id, block in blocks.items():
                    if isinstance(block, list):
                        continue
                    _require(isinstance(block, dict), f"{context}.blocks[{block_id}] is invalid")
                    opcode = block.get("opcode")
                    _require(isinstance(opcode, str), f"{context}.blocks[{block_id}] has no opcode")
                    _require(opcode in STANDARD_OPCODES, f"non-Scratch or extension opcode is forbidden: {opcode}")
                    checks += 2

                for asset_index, asset in enumerate(costumes):
                    checks += _validate_asset(archive, members, asset, f"{context}.costumes[{asset_index}]")
                for asset_index, asset in enumerate(sounds):
                    checks += _validate_asset(archive, members, asset, f"{context}.sounds[{asset_index}]")
    except (OSError, zipfile.BadZipFile, ValidationError) as error:
        errors.append(str(error))
    return Result(
        game=game,
        project=project,
        archive=str(path),
        status="passed" if not errors else "failed",
        checks=checks,
        errors=errors,
    )


def _load_projects(repository: Path, manifest: Path) -> list[tuple[str, str, Path]]:
    projects: list[tuple[str, str, Path]] = []
    for raw_line in manifest.read_text(encoding="utf-8").splitlines():
        project = raw_line.split("#", 1)[0].strip()
        if not project:
            continue
        game = "root-smoke" if project == "." else Path(project).name
        projects.append((game, project, repository))
    return projects


def _write_junit(path: Path, results: list[Result]) -> None:
    suite = ElementTree.Element(
        "testsuite",
        name="sb3-static-validation",
        tests=str(len(results)),
        failures=str(sum(result.status == "failed" for result in results)),
    )
    for result in results:
        case = ElementTree.SubElement(
            suite,
            "testcase",
            classname="scratch.static",
            name=f"{result.game} [{result.project}]",
        )
        if result.errors:
            failure = ElementTree.SubElement(case, "failure", message=result.errors[0])
            failure.text = "\n".join(result.errors)
    path.parent.mkdir(parents=True, exist_ok=True)
    ElementTree.ElementTree(suite).write(path, encoding="utf-8", xml_declaration=True)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-dir", type=Path, required=True)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--json-report", type=Path, required=True)
    parser.add_argument("--junit-report", type=Path, required=True)
    args = parser.parse_args()

    repository = args.manifest.resolve().parents[1]
    projects = _load_projects(repository, args.manifest)
    results = [
        validate_archive(args.input_dir / f"{game}.sb3", game, project)
        for game, project, _ in projects
    ]
    report = {
        "schema_version": "1.0.0",
        "validator": "mirai-sb3-static",
        "projects": [asdict(result) for result in results],
        "summary": {
            "total": len(results),
            "passed": sum(result.status == "passed" for result in results),
            "failed": sum(result.status == "failed" for result in results),
        },
    }
    args.json_report.parent.mkdir(parents=True, exist_ok=True)
    args.json_report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    _write_junit(args.junit_report, results)

    for result in results:
        if result.errors:
            print(f"FAIL game={result.game} project={result.project} archive={result.archive}", file=sys.stderr)
            for error in result.errors:
                print(f"  {error}", file=sys.stderr)
        else:
            print(f"PASS game={result.game} project={result.project} checks={result.checks}")
    return 1 if any(result.errors for result in results) else 0


if __name__ == "__main__":
    raise SystemExit(main())
