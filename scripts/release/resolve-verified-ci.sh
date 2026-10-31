#!/usr/bin/env bash
# Resolve the CI artifact for a successful push of the exact current main HEAD.
set -euo pipefail
fail() { printf 'RELEASE GATE: %s\n' "$*" >&2; exit 1; }
[[ $# -eq 1 ]] || fail 'usage: resolve-verified-ci.sh <full-main-SHA>'
requested_sha="$1"
[[ "$requested_sha" =~ ^[0-9a-f]{40}$ ]] || fail 'a full lowercase 40-digit commit SHA is required'
[[ "${GITHUB_REF:-}" == 'refs/heads/main' ]] || fail 'production dispatch must run from refs/heads/main'
repo="${GITHUB_REPOSITORY:-}"
[[ "$repo" =~ ^[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+$ ]] || fail 'GITHUB_REPOSITORY is not a safe owner/repo'
main_body="$(gh api "repos/$repo/branches/main")" || fail 'cannot resolve current main commit'
main_sha="$(jq -er '.commit.sha' <<< "$main_body")" || fail 'main response missing source SHA'
[[ "$main_sha" == "$requested_sha" ]] || fail 'requested SHA differs from current main HEAD'
runs_body="$(gh api "repos/$repo/actions/workflows/ci.yml/runs?branch=main&event=push&per_page=100")" || fail 'unable to query CI push runs'
run_id="$(jq -er --arg sha "$requested_sha" '
  [.workflow_runs[]? | select(.head_sha == $sha and .head_branch == "main" and .event == "push" and .status == "completed" and .conclusion == "success")]
  | sort_by(.created_at) | last | .id' <<< "$runs_body")" || fail 'no successful completed CI push run for exact source commit'
[[ "$run_id" =~ ^[1-9][0-9]*$ ]] || fail 'invalid CI run ID'
artifact_name="linket-ci-$requested_sha"
artifacts_body="$(gh api "repos/$repo/actions/runs/$run_id/artifacts?per_page=100")" || fail 'cannot retrieve CI artifact metadata'
count="$(jq -er --arg name "$artifact_name" '[.artifacts[]? | select(.name == $name and .expired == false and (.size_in_bytes | type == "number" and . > 0))] | length' <<< "$artifacts_body")" || fail 'invalid artifact listing'
[[ "$count" == 1 ]] || fail 'expected exactly one unexpired nonempty artifact from green CI'
[[ -n "${GITHUB_OUTPUT:-}" ]] || fail 'GITHUB_OUTPUT is required'
{
  printf 'sha=%s\n' "$requested_sha"
  printf 'ci_run_id=%s\n' "$run_id"
  printf 'artifact_name=%s\n' "$artifact_name"
} >> "$GITHUB_OUTPUT"
echo "Green main CI run validated: SHA=$requested_sha run_id=$run_id artifact=$artifact_name"
