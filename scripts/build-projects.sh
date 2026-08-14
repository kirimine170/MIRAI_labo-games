#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
repo_root="$(cd "$script_dir/.." && pwd -P)"

# shellcheck source=../tools/goboscript-version.env
source "$repo_root/tools/goboscript-version.env"

default_bin="$repo_root/.tools/goboscript/bin/goboscript"
if [[ -n "${GOBOSCRIPT_BIN:-}" ]]; then
    goboscript_bin="$GOBOSCRIPT_BIN"
elif [[ -x "$default_bin" ]]; then
    goboscript_bin="$default_bin"
else
    goboscript_bin="$(command -v goboscript || true)"
fi

[[ -n "$goboscript_bin" && -x "$goboscript_bin" ]] || {
    printf 'error: goboscript is not installed．Run ./scripts/bootstrap-goboscript.sh first．\n' >&2
    exit 1
}

expected_short_revision="${GOBOSCRIPT_REVISION:0:7}"
"$goboscript_bin" --version | grep -Fq "$expected_short_revision" || {
    printf 'error: expected goboscript revision %s．Found: %s\n' \
        "$expected_short_revision" "$("$goboscript_bin" --version)" >&2
    exit 1
}

"$repo_root/scripts/check-repository.sh"

output_dir="${1:-$repo_root/build}"
mkdir -p "$output_dir"

project_count=0
while IFS= read -r project; do
    [[ -n "$project" ]] || continue

    if [[ "$project" == "." ]]; then
        artifact_name="root-smoke"
    else
        artifact_name="$(basename "$project")"
    fi

    output_file="$output_dir/$artifact_name.sb3"
    "$goboscript_bin" build "$repo_root/$project" --output "$output_file"
    unzip -tqq "$output_file"
    printf 'Built %s\n' "$output_file"
    project_count=$((project_count + 1))
done < <(sed -e 's/[[:space:]]*#.*$//' -e '/^[[:space:]]*$/d' "$repo_root/tools/projects.txt")

printf 'Build OK: %d artifacts in %s\n' "$project_count" "$output_dir"
