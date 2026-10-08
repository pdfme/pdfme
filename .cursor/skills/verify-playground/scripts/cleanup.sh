#!/usr/bin/env bash
# Stop only the processes this verification run recorded.
# Does not delete tmp/verify-playground/evidence.

set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

stop_recorded() {
  local file=$1
  local label=$2
  if [[ ! -f "$file" ]]; then
    return 0
  fi
  local pid
  pid=$(cat "$file" || true)
  if [[ ! "$pid" =~ ^[0-9]+$ ]]; then
    rm -f "$file"
    echo "removed invalid ${label} pid file"
    return 0
  fi
  if [[ -d "/proc/${pid}" ]]; then
    kill_tree "$pid"
    sleep 1
    force_kill_tree "$pid"
    echo "stopped ${label} pid ${pid}"
  else
    echo "${label} pid ${pid} was already gone"
  fi
  rm -f "$file"
}

stop_recorded "$CHROME_PIDFILE" "chrome"
stop_recorded "$PIDFILE" "server"

if [[ -d "$EVIDENCE" ]]; then
  echo "evidence kept at ${EVIDENCE}"
else
  echo "no evidence directory yet (${EVIDENCE})"
fi
