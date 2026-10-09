#!/usr/bin/env bash
# Stop only the processes this verification run recorded.
# Does not delete tmp/verify-playground/evidence.

set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

stop_recorded "$CHROME_PIDFILE" "chrome"
stop_recorded "$PIDFILE" "server"

if [[ -d "$EVIDENCE" ]]; then
  echo "evidence kept at ${EVIDENCE}"
else
  echo "no evidence directory yet (${EVIDENCE})"
fi
