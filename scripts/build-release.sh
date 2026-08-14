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

output_dir="${1:-$repo_root/release}"
bundle_version="${RELEASE_VERSION:-0.0.0}"
mkdir -p "$output_dir"
[[ -z "$(ls -A "$output_dir")" ]] || {
    printf 'error: release output directory must be empty: %s\n' "$output_dir" >&2
    exit 1
}

"$repo_root/scripts/check-repository.sh"
PYTHONDONTWRITEBYTECODE=1 python3 "$repo_root/tools/validate_catalog.py"
PYTHONDONTWRITEBYTECODE=1 python3 "$repo_root/tools/game_versions.py" release-ready

artifact_count=0
while IFS=$'\t' read -r game_id version slug project_path; do
    [[ -n "$game_id" ]] || continue
    artifact_name="${game_id}-${slug}-v${version}.sb3"
    output_file="$output_dir/$artifact_name"
    "$goboscript_bin" build "$repo_root/$project_path" --output "$output_file"
    unzip -tqq "$output_file"
    printf 'Built release artifact %s\n' "$artifact_name"
    artifact_count=$((artifact_count + 1))
done < <(PYTHONDONTWRITEBYTECODE=1 python3 "$repo_root/tools/game_versions.py" release-list)

PYTHONDONTWRITEBYTECODE=1 python3 "$repo_root/tools/game_versions.py" \
    release-manifest "$output_dir" "$bundle_version"

printf 'Release build OK: %d versioned artifacts in %s\n' \
    "$artifact_count" "$output_dir"
