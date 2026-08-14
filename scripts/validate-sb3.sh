#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
repo_root="$(cd "$script_dir/.." && pwd -P)"
input_dir="${1:-$repo_root/build}"
report_dir="${SCRATCH_VALIDATION_REPORT_DIR:-$input_dir/reports}"

python3 "$repo_root/tools/scratch-validation/static_validator.py" \
    --input-dir "$input_dir" \
    --manifest "$repo_root/tools/projects.txt" \
    --json-report "$report_dir/sb3-static.json" \
    --junit-report "$report_dir/sb3-static.junit.xml"

printf 'SB3 static validation OK: reports in %s\n' "$report_dir"
