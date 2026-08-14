#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
repo_root="$(cd "$script_dir/.." && pwd -P)"
tool_dir="$repo_root/tools/scratch-validation"
[[ $# -le 1 ]] || {
    printf 'usage: %s [existing-or-output-sb3-directory]\n' "$0" >&2
    exit 2
}
complete_dir="${1:-${MIRAI_SB3_DIR:-$repo_root/build}}"
defect_dir="${SCRATCH_VALIDATION_DEFECT_DIR:-$complete_dir/defects}"
report_dir="${SCRATCH_VALIDATION_REPORT_DIR:-$complete_dir/reports}"

if [[ ! -d "$tool_dir/node_modules/@scratch/scratch-vm" ]]; then
    printf 'Installing the pinned Scratch validation dependencies．\n'
    npm ci --prefix "$tool_dir" --ignore-scripts
fi

missing_artifact=0
while IFS= read -r project; do
    [[ -n "$project" ]] || continue
    if [[ "$project" == "." ]]; then
        artifact="root-smoke"
    else
        artifact="$(basename "$project")"
    fi
    [[ -f "$complete_dir/$artifact.sb3" ]] || missing_artifact=1
done < <(sed -e 's/[[:space:]]*#.*$//' -e '/^[[:space:]]*$/d' "$repo_root/tools/projects.txt")

# With no explicit build directory，the public one-command entry point always
# rebuilds current sources．An explicit complete directory can be reused by CI．
if [[ $# -eq 0 && -z "${MIRAI_SB3_DIR:-}" ]]; then
    "$repo_root/scripts/build-projects.sh" "$complete_dir"
elif [[ "$missing_artifact" -eq 1 ]]; then
    "$repo_root/scripts/build-projects.sh" "$complete_dir"
else
    printf 'Using the existing complete-project build in %s\n' "$complete_dir"
fi

SCRATCH_VALIDATION_REPORT_DIR="$report_dir" \
    "$repo_root/scripts/validate-sb3.sh" "$complete_dir"

mkdir -p "$defect_dir" "$report_dir"
"$repo_root/scripts/build-student-defect.sh" \
    games/sword-clicker \
    games/sword-clicker/defects/00_00-D01-hp-zero-stall.patch \
    "$defect_dir/sword-clicker.sb3"
"$repo_root/scripts/build-student-defect.sh" \
    games/robot-repair-clicker \
    games/robot-repair-clicker/defects/00_01-D01-stale-robot-costume.patch \
    "$defect_dir/robot-repair-clicker.sb3"
"$repo_root/scripts/build-student-defect.sh" \
    games/00_06_click_nature \
    games/00_06_click_nature/defects/D01/remove-fish-progress-update.patch \
    "$defect_dir/00_06_click_nature.sb3"
"$repo_root/scripts/build-student-defect.sh" \
    games/00_07_click_sports \
    games/00_07_click_sports/defects/00_07-D01-stale-runner.patch \
    "$defect_dir/00_07_click_sports.sb3"

node "$tool_dir/src/runner.js" \
    --complete-dir "$complete_dir" \
    --defect-dir "$defect_dir" \
    --report-dir "$report_dir"

printf 'Scratch validation OK: artifacts=%s reports=%s\n' "$complete_dir" "$report_dir"
