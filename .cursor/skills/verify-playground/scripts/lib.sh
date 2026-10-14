#!/usr/bin/env bash
# Shared paths for the playground verification scripts.
# Source this file; do not execute it.
# Uses bash 3.2 features only, and ps/pgrep/lsof so it works on macOS and Linux.

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

RECORDED_PID=""
RECORDED_LSTART=""

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
    ss -ltnp "sport = :$port" 2>/dev/null | sed -n 's/.*pid=\([0-9][0-9]*\).*/\1/p' || true
    return 0
  fi
  echo "need lsof (macOS and Linux) or ss to see which process owns the port" >&2
  return 1
}

# Locale-stable start time. Compared on the same machine, so a reused pid does not match.
process_lstart() {
  LC_ALL=C ps -o lstart= -p "$1" 2>/dev/null | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' || true
}

read_recorded() {
  local file=$1
  local line key value
  RECORDED_PID=""
  RECORDED_LSTART=""
  if [[ ! -f "$file" ]]; then
    return 1
  fi
  while IFS= read -r line || [[ -n "$line" ]]; do
    key=${line%%=*}
    value=${line#*=}
    if [[ "$key" == "pid" ]]; then
      RECORDED_PID=$value
    elif [[ "$key" == "lstart" ]]; then
      RECORDED_LSTART=$value
    fi
  done <"$file"
}

write_recorded() {
  local file=$1
  local pid=$2
  local started
  started=$(process_lstart "$pid")
  if [[ -z "$started" ]]; then
    return 1
  fi
  printf 'pid=%s\nlstart=%s\n' "$pid" "$started" >"$file"
}

recorded_is_live() {
  local actual
  if [[ ! "$RECORDED_PID" =~ ^[0-9]+$ || -z "$RECORDED_LSTART" ]]; then
    return 1
  fi
  actual=$(process_lstart "$RECORDED_PID")
  [[ -n "$actual" && "$actual" == "$RECORDED_LSTART" ]]
}

parent_pid() {
  LC_ALL=C ps -o ppid= -p "$1" 2>/dev/null | tr -d '[:space:]' || true
}

child_pids() {
  local parent=$1
  if command -v pgrep >/dev/null 2>&1; then
    pgrep -P "$parent" 2>/dev/null || true
    return 0
  fi
  ps -ax -o pid=,ppid= 2>/dev/null | awk -v parent="$parent" '$2 == parent { print $1 }'
}

pid_is_in_tree() {
  local root_pid=$1
  local pid=$2
  local hops=0
  while [[ -n "${pid}" && "${pid}" != "0" && "${pid}" != "1" && "${hops}" -lt 40 ]]; do
    if [[ "${pid}" == "${root_pid}" ]]; then
      return 0
    fi
    pid=$(parent_pid "$pid")
    hops=$((hops + 1))
  done
  return 1
}

collect_descendants() {
  local pid=$1
  local child
  echo "$pid"
  for child in $(child_pids "$pid"); do
    collect_descendants "$child"
  done
}

# Snapshot the tree, then signal that list twice. A later walk would miss
# children reparented after the recorded parent exits.
stop_recorded() {
  local file=$1
  local label=$2
  local actual pids pid
  if [[ ! -f "$file" ]]; then
    return 0
  fi
  read_recorded "$file" || true
  if [[ ! "$RECORDED_PID" =~ ^[0-9]+$ || -z "$RECORDED_LSTART" ]]; then
    rm -f "$file"
    echo "removed ${label} pid file without a pid and start time; not signaling"
    return 0
  fi
  actual=$(process_lstart "$RECORDED_PID")
  if [[ -z "$actual" ]]; then
    rm -f "$file"
    echo "${label} pid ${RECORDED_PID} was already gone"
    return 0
  fi
  if [[ "$actual" != "$RECORDED_LSTART" ]]; then
    rm -f "$file"
    echo "${label} pid ${RECORDED_PID} was reused by another process; not signaling"
    return 0
  fi
  pids=$(collect_descendants "$RECORDED_PID")
  for pid in $pids; do
    kill -TERM "$pid" 2>/dev/null || true
  done
  sleep 1
  for pid in $pids; do
    if kill -0 "$pid" 2>/dev/null; then
      kill -KILL "$pid" 2>/dev/null || true
    fi
  done
  rm -f "$file"
  echo "stopped ${label} pid ${RECORDED_PID}"
}
