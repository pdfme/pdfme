#!/usr/bin/env bash
# Shared paths for the playground verification scripts.
# Source this file; do not execute it.

set -euo pipefail

SKILL_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ROOT=$(cd "$SKILL_DIR/../../../.." && pwd)
STATE="$ROOT/tmp/verify-playground"
EVIDENCE="$STATE/evidence"
PORT=5193
CDP_PORT=9333
BASE_URL="http://127.0.0.1:${PORT}"
PIDFILE="$STATE/server.pid"
LOGFILE="$STATE/server.log"
CHROME_PIDFILE="$STATE/chrome.pid"
CHROME_LOG="$STATE/chrome.log"
BASE_URL_FILE="$STATE/base-url"

require_node() {
  local version major minor
  version=$(node -v | sed 's/^v//')
  major=${version%%.*}
  minor=$(echo "$version" | cut -d. -f2)
  if ((major > 26 || major == 26)); then
    return 0
  fi
  if ((major == 24 && minor >= 11)); then
    return 0
  fi
  if ((major == 22 && minor >= 18)); then
    return 0
  fi
  echo "node v${version} does not satisfy vite-plus@1.0.0 engines: ^22.18.0 || ^24.11.0 || >=26.0.0" >&2
  echo "The playground dev script runs vp, which is vite-plus. Put a matching node first on PATH." >&2
  exit 1
}

listener_pids() {
  local port=$1
  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null || true
    return 0
  fi
  if command -v ss >/dev/null 2>&1; then
    ss -ltnp "sport = :$port" 2>/dev/null | sed -n 's/.*pid=\([0-9]\+\).*/\1/p' || true
    return 0
  fi
  echo "need lsof or ss to see which process owns the port" >&2
  return 1
}

pid_is_in_tree() {
  local root_pid=$1
  local pid=$2
  local hops=0
  while [[ -n "${pid}" && "${pid}" != "0" && "${hops}" -lt 40 ]]; do
    if [[ "${pid}" == "${root_pid}" ]]; then
      return 0
    fi
    if [[ ! -r "/proc/${pid}/status" ]]; then
      return 1
    fi
    pid=$(awk '/^PPid:/ { print $2 }' "/proc/${pid}/status")
    hops=$((hops + 1))
  done
  return 1
}

kill_tree() {
  local pid=${1:-}
  local child
  if [[ ! "${pid}" =~ ^[0-9]+$ ]]; then
    return 0
  fi
  if [[ ! -d "/proc/${pid}" ]]; then
    return 0
  fi
  for child in $(ps -o pid= --ppid "${pid}" 2>/dev/null); do
    kill_tree "${child}"
  done
  kill -TERM "${pid}" 2>/dev/null || true
}

force_kill_tree() {
  local pid=${1:-}
  local child
  if [[ ! "${pid}" =~ ^[0-9]+$ ]]; then
    return 0
  fi
  if [[ ! -d "/proc/${pid}" ]]; then
    return 0
  fi
  for child in $(ps -o pid= --ppid "${pid}" 2>/dev/null); do
    force_kill_tree "${child}"
  done
  kill -KILL "${pid}" 2>/dev/null || true
}
