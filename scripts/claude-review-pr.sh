#!/usr/bin/env bash

set -euo pipefail

show_help() {
  cat <<'EOF'
usage: scripts/claude-review-pr.sh [pr-number-or-url] [review focus...]

Runs Claude Code's built-in /review command for a pull request.
If no PR is supplied, the script uses the PR associated with the current branch.

Defaults:
  model:           opus
  effort:          max
  permission mode: auto

Environment overrides:
  CLAUDE_REVIEW_MODEL
  CLAUDE_REVIEW_EFFORT
  CLAUDE_REVIEW_PERMISSION_MODE
  CLAUDE_REVIEW_OUTPUT_DIR

Examples:
  npm run claude:review
  npm run claude:review -- 1489
  npm run claude:review -- 1489 Focus on dynamic layout regressions
EOF
}

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
  show_help
  exit 0
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "error: gh CLI is required" >&2
  exit 1
fi

if ! command -v claude >/dev/null 2>&1; then
  echo "error: Claude Code CLI is required" >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "error: gh is not authenticated; run gh auth login first" >&2
  exit 1
fi

model="${CLAUDE_REVIEW_MODEL:-opus}"
effort="${CLAUDE_REVIEW_EFFORT:-max}"
permission_mode="${CLAUDE_REVIEW_PERMISSION_MODE:-auto}"
output_dir="${CLAUDE_REVIEW_OUTPUT_DIR:-tmp/claude-reviews}"

pr="${1:-}"
if [ -n "$pr" ]; then
  shift
else
  if ! pr="$(gh pr view --json number --jq '.number' 2>/dev/null)"; then
    echo "error: no PR is associated with the current branch" >&2
    echo "pass a PR number or URL, for example: npm run claude:review -- 1489" >&2
    echo "" >&2
    echo "open PRs:" >&2
    gh pr list --limit 10 >&2 || true
    exit 1
  fi
fi

focus="$*"
prompt="/review $pr"
if [ -n "$focus" ]; then
  prompt="$prompt $focus"
fi

mkdir -p "$output_dir"
safe_pr="$(printf '%s' "$pr" | sed 's#[^A-Za-z0-9._-]#_#g')"
stamp="$(date '+%Y%m%d-%H%M%S')"
output_file="$output_dir/claude-review-${safe_pr}-${stamp}.md"

{
  echo "# Claude Code Review"
  echo ""
  echo "- PR: $pr"
  echo "- Model: $model"
  echo "- Effort: $effort"
  echo "- Permission mode: $permission_mode"
  if [ -n "$focus" ]; then
    echo "- Focus: $focus"
  fi
  echo "- Generated at: $(date '+%Y-%m-%d %H:%M:%S %Z')"
  echo ""
  echo '```bash'
  echo "claude -p --model \"$model\" --effort \"$effort\" --permission-mode \"$permission_mode\" \"$prompt\""
  echo '```'
  echo ""
} >"$output_file"

echo "Running Claude Code /review for PR $pr"
echo "Model: $model, effort: $effort, permission mode: $permission_mode"
echo "Saving output to: $output_file"
echo ""

set +e
claude -p --model "$model" --effort "$effort" --permission-mode "$permission_mode" "$prompt" | tee -a "$output_file"
status=${PIPESTATUS[0]}
set -e

echo ""
if [ "$status" -eq 0 ]; then
  echo "Claude review saved to: $output_file"
else
  echo "Claude review failed with exit code $status. Partial output saved to: $output_file" >&2
fi

exit "$status"
