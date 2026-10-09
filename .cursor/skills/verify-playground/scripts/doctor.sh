#!/usr/bin/env bash
# Read-only: the recorded server pid is alive and it owns the verification port.

set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

if [[ ! -f "$PIDFILE" ]]; then
  echo "No pid file at ${PIDFILE}. Launch first." >&2
  exit 1
fi

read_recorded "$PIDFILE" || true
if ! recorded_is_live; then
  echo "Recorded pid ${RECORDED_PID:-?} is not the process this run started." >&2
  exit 1
fi

listeners=$(listener_pids "$PORT")
if [[ -z "$listeners" ]]; then
  echo "Nothing is listening on port ${PORT}." >&2
  exit 1
fi

owned=""
for listener in $listeners; do
  if pid_is_in_tree "$RECORDED_PID" "$listener"; then
    owned="${owned} ${listener}"
  fi
done

if [[ -z "$owned" ]]; then
  echo "Port ${PORT} listeners (${listeners}) are not descendants of recorded pid ${RECORDED_PID}." >&2
  exit 1
fi

echo "ok pid=${RECORDED_PID} port=${PORT} listeners=${owned# } base=${BASE_URL}"
