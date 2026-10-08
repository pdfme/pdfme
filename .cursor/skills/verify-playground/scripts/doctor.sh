#!/usr/bin/env bash
# Read-only: the recorded server pid is alive and it owns the verification port.

set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

if [[ ! -f "$PIDFILE" ]]; then
  echo "No pid file at ${PIDFILE}. Launch first." >&2
  exit 1
fi

server_pid=$(cat "$PIDFILE")
if [[ ! "$server_pid" =~ ^[0-9]+$ ]]; then
  echo "Pid file does not contain a pid: ${PIDFILE}" >&2
  exit 1
fi

if ! kill -0 "$server_pid" 2>/dev/null; then
  echo "Recorded pid ${server_pid} is not running." >&2
  exit 1
fi

listeners=$(listener_pids "$PORT")
if [[ -z "$listeners" ]]; then
  echo "Nothing is listening on port ${PORT}." >&2
  exit 1
fi

owned=""
for listener in $listeners; do
  if pid_is_in_tree "$server_pid" "$listener"; then
    owned="${owned} ${listener}"
  fi
done

if [[ -z "$owned" ]]; then
  echo "Port ${PORT} listeners (${listeners}) are not descendants of recorded pid ${server_pid}." >&2
  exit 1
fi

echo "ok pid=${server_pid} port=${PORT} listeners=${owned# } base=${BASE_URL}"
