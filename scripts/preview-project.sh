#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
repo_root="$(cd "$script_dir/.." && pwd -P)"

usage() {
    printf 'usage: %s games/<project>\n' "$0" >&2
    exit 2
}

[[ $# -eq 1 ]] || usage
project="$1"
[[ "$project" == games/* && "$project" != *".."* && "$project" != /* ]] || usage
[[ -d "$repo_root/$project" ]] || {
    printf 'error: project does not exist: %s\n' "$project" >&2
    exit 1
}
grep -Fqx "$project" "$repo_root/tools/projects.txt" || {
    printf 'error: project is not registered in tools/projects.txt: %s\n' "$project" >&2
    exit 1
}

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
"$goboscript_bin" --version | grep -Fq "${GOBOSCRIPT_REVISION:0:7}" || {
    printf 'error: goboscript does not match pinned revision %s\n' "${GOBOSCRIPT_REVISION:0:7}" >&2
    exit 1
}

preview_dir="${MIRAI_PREVIEW_DIR:-$repo_root/build/preview}"
mkdir -p "$preview_dir"
output="$preview_dir/$(basename "$project").sb3"
"$goboscript_bin" build "$repo_root/$project" --output "$output"
unzip -tqq "$output"

printf 'TurboWarp interaction preview prepared: %s\n' "$output"
printf '%s\n' \
    'Load this file manually in TurboWarp Desktop or the TurboWarp editor．' \
    'Compatibility profile: 480x360，30 FPS，Scratch standard clone limit，no custom blocks/extensions．' \
    'Disabling the compiler can be used only as an auxiliary comparison．' \
    'TurboWarp success is not proof of compatibility with the official Scratch editor．' \
    'No TurboWarp CLI option or automatic website interaction is used．'
