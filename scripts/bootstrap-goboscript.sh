#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
repo_root="$(cd "$script_dir/.." && pwd -P)"

# shellcheck source=../tools/goboscript-version.env
source "$repo_root/tools/goboscript-version.env"

install_root="${GOBOSCRIPT_INSTALL_ROOT:-$repo_root/.tools/goboscript}"
goboscript_bin="$install_root/bin/goboscript"
expected_short_revision="${GOBOSCRIPT_REVISION:0:7}"

if [[ -x "$goboscript_bin" ]] &&
    "$goboscript_bin" --version | grep -Fq "$expected_short_revision"; then
    printf 'goboscript %s is already installed at %s\n' "$expected_short_revision" "$goboscript_bin"
    exit 0
fi

command -v rustup >/dev/null 2>&1 || {
    printf 'error: rustup is required: https://rustup.rs/\n' >&2
    exit 1
}

rustup toolchain install "$GOBOSCRIPT_RUST_TOOLCHAIN" --profile minimal
cargo "+$GOBOSCRIPT_RUST_TOOLCHAIN" install \
    --git "$GOBOSCRIPT_REPOSITORY" \
    --rev "$GOBOSCRIPT_REVISION" \
    --locked \
    --force \
    --root "$install_root"

"$goboscript_bin" --version | grep -Fq "$expected_short_revision" || {
    printf 'error: installed goboscript does not match revision %s\n' "$GOBOSCRIPT_REVISION" >&2
    exit 1
}

printf 'Installed %s\n' "$("$goboscript_bin" --version)"
