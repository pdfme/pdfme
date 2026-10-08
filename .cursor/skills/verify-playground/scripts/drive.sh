#!/usr/bin/env bash
# Drive the Designer once over CDP and write evidence under tmp/verify-playground/evidence.

set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

"$(dirname "${BASH_SOURCE[0]}")/doctor.sh" >/dev/null

if [[ -f "$CHROME_PIDFILE" ]]; then
  chrome_existing=$(cat "$CHROME_PIDFILE" || true)
  if [[ "$chrome_existing" =~ ^[0-9]+$ ]] && kill -0 "$chrome_existing" 2>/dev/null; then
    echo "Chrome from a previous drive is still pid ${chrome_existing}. Run scripts/cleanup.sh first." >&2
    exit 1
  fi
  rm -f "$CHROME_PIDFILE"
fi

if [[ -n "$(listener_pids "$CDP_PORT")" ]]; then
  echo "CDP port ${CDP_PORT} is already in use. This run uses its own debugging port." >&2
  exit 1
fi

chrome_bin=""
for candidate in google-chrome google-chrome-stable chromium chromium-browser; do
  if command -v "$candidate" >/dev/null 2>&1; then
    chrome_bin=$(command -v "$candidate")
    break
  fi
done
if [[ -z "$chrome_bin" ]]; then
  echo "No Chrome or Chromium binary on PATH." >&2
  exit 1
fi

mkdir -p "$EVIDENCE"
profile="$STATE/chrome-profile"
rm -rf "$profile"
mkdir -p "$profile"

stop_chrome() {
  if [[ -f "$CHROME_PIDFILE" ]]; then
    chrome_pid=$(cat "$CHROME_PIDFILE" || true)
    if [[ "$chrome_pid" =~ ^[0-9]+$ ]]; then
      kill_tree "$chrome_pid"
      sleep 0.5
      force_kill_tree "$chrome_pid"
    fi
    rm -f "$CHROME_PIDFILE"
  fi
}
trap stop_chrome EXIT

: >"$CHROME_LOG"
nohup "$chrome_bin" \
  --headless=new \
  --no-sandbox \
  --disable-gpu \
  --disable-dev-shm-usage \
  --remote-debugging-port="$CDP_PORT" \
  --remote-allow-origins=* \
  --user-data-dir="$profile" \
  --window-size=1366,768 \
  about:blank >"$CHROME_LOG" 2>&1 &
echo $! >"$CHROME_PIDFILE"

deadline=$((SECONDS + 20))
until curl -fsS "http://127.0.0.1:${CDP_PORT}/json/version" >/dev/null 2>&1; do
  if ((SECONDS >= deadline)); then
    echo "Chrome CDP did not open on port ${CDP_PORT}." >&2
    tail -n 40 "$CHROME_LOG" >&2 || true
    exit 1
  fi
  sleep 0.2
done

node "$SKILL_DIR/cdp-drive.mjs"
echo "evidence ${EVIDENCE}"
