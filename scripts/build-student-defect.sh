#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
repo_root="$(cd "$script_dir/.." && pwd -P)"

# shellcheck source=../tools/goboscript-version.env
source "$repo_root/tools/goboscript-version.env"

usage() {
    printf 'usage: %s <game-directory> <defect-patch> <output.sb3>\n' "$0" >&2
    exit 2
}

fail() {
    printf 'error: %s\n' "$*" >&2
    exit 1
}

[[ $# -eq 3 ]] || usage

game_path="$1"
patch_path="$2"
output_file="$3"

[[ "$game_path" != /* && "$game_path" != *".."* ]] ||
    fail "game-directory must be a repository-relative path without '..'"
[[ "$patch_path" != /* && "$patch_path" != *".."* ]] ||
    fail "defect-patch must be a repository-relative path without '..'"
[[ "$game_path" == games/* ]] || fail "game-directory must be under games/"
[[ "$patch_path" == "$game_path"/defects/*.patch ]] ||
    fail "defect-patch must be a .patch file inside the selected game's defects/ directory"
[[ -d "$repo_root/$game_path" ]] || fail "game-directory does not exist: $game_path"
[[ -f "$repo_root/$patch_path" ]] || fail "defect-patch does not exist: $patch_path"
[[ "$output_file" == *.sb3 ]] || fail "output path must end in .sb3"

default_bin="$repo_root/.tools/goboscript/bin/goboscript"
if [[ -n "${GOBOSCRIPT_BIN:-}" ]]; then
    goboscript_bin="$GOBOSCRIPT_BIN"
elif [[ -x "$default_bin" ]]; then
    goboscript_bin="$default_bin"
else
    goboscript_bin="$(command -v goboscript || true)"
fi

[[ -n "$goboscript_bin" && -x "$goboscript_bin" ]] ||
    fail "goboscript is not installed．Run ./scripts/bootstrap-goboscript.sh first．"

expected_short_revision="${GOBOSCRIPT_REVISION:0:7}"
"$goboscript_bin" --version | grep -Fq "$expected_short_revision" ||
    fail "goboscript does not match pinned revision $expected_short_revision"

temp_root="$(mktemp -d "${TMPDIR:-/tmp}/mirai-student-defect.XXXXXX")"
trap 'rm -rf -- "$temp_root"' EXIT

mkdir -p "$temp_root/$(dirname "$game_path")"
cp -R "$repo_root/$game_path" "$temp_root/$game_path"

(cd "$temp_root" && git apply "$repo_root/$patch_path")

# Teacher-only material must never be part of the copied project used for delivery．
rm -rf -- "$temp_root/$game_path/defects"

mkdir -p "$(dirname "$output_file")"
"$goboscript_bin" build "$temp_root/$game_path" --output "$output_file"
unzip -tqq "$output_file"

if unzip -p "$output_file" project.json | grep -Eq 'root_cause|minimal_fix|defect_id|D0[0-9]'; then
    fail "teacher-only defect metadata was found in the generated project"
fi

printf 'Built student defect project: %s\n' "$output_file"
printf 'Only the generated .sb3 should be distributed to learners．\n'
