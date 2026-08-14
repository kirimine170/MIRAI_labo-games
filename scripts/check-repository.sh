#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
repo_root="$(cd "$script_dir/.." && pwd -P)"
project_manifest="$repo_root/tools/projects.txt"
version_file="$repo_root/tools/goboscript-version.env"

fail() {
    printf 'error: %s\n' "$*" >&2
    exit 1
}

[[ -f "$project_manifest" ]] || fail "missing tools/projects.txt"
[[ -f "$version_file" ]] || fail "missing tools/goboscript-version.env"

# shellcheck source=../tools/goboscript-version.env
source "$version_file"

[[ -n "${GOBOSCRIPT_REVISION:-}" ]] || fail "GOBOSCRIPT_REVISION is empty"
[[ "$GOBOSCRIPT_REVISION" =~ ^[0-9a-f]{40}$ ]] || fail "GOBOSCRIPT_REVISION must be a full Git commit SHA"
[[ -n "${GOBOSCRIPT_RUST_TOOLCHAIN:-}" ]] || fail "GOBOSCRIPT_RUST_TOOLCHAIN is empty"
[[ -n "${GOBOSCRIPT_STD_VERSION:-}" ]] || fail "GOBOSCRIPT_STD_VERSION is empty"

project_list="$(sed -e 's/[[:space:]]*#.*$//' -e '/^[[:space:]]*$/d' "$project_manifest")"
[[ -n "$project_list" ]] || fail "tools/projects.txt contains no projects"

duplicates="$(printf '%s\n' "$project_list" | sort | uniq -d)"
[[ -z "$duplicates" ]] || fail "duplicate project path: $duplicates"

project_count=0
while IFS= read -r project; do
    [[ -n "$project" ]] || continue
    [[ "$project" != /* ]] || fail "project path must be relative: $project"
    [[ "$project" != *".."* ]] || fail "project path must not contain '..': $project"

    project_dir="$repo_root/$project"
    [[ -d "$project_dir" ]] || fail "project directory does not exist: $project"
    [[ -f "$project_dir/goboscript.toml" ]] || fail "missing goboscript.toml: $project"
    [[ -f "$project_dir/stage.gs" ]] || fail "missing stage.gs: $project"
    [[ -f "$project_dir/main.gs" ]] || fail "missing main.gs: $project"
    [[ -d "$project_dir/assets" ]] || fail "missing assets directory: $project"

    expected_std="std = \"$GOBOSCRIPT_STD_VERSION\""
    grep -Fqx "$expected_std" "$project_dir/goboscript.toml" ||
        fail "$project/goboscript.toml must contain: $expected_std"

    project_count=$((project_count + 1))
done <<< "$project_list"

if [[ -n "$(git -C "$repo_root" ls-files '*.sb3')" ]]; then
    fail "generated .sb3 files must not be tracked"
fi

printf 'Repository structure OK: %d goboscript projects\n' "$project_count"
