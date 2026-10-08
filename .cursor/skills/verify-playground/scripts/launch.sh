#!/usr/bin/env bash
# Start the playground dev server on the dedicated verification port.

set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

require_node

if [[ ! -f "$ROOT/packages/ui/dist/index.js" ]]; then
  echo "Missing packages/ui/dist/index.js. The playground imports @pdfme/* from each package dist." >&2
  echo "From the repo root, run: npm run build" >&2
  exit 1
fi

if [[ ! -x "$ROOT/playground/node_modules/.bin/vp" ]]; then
  echo "Missing playground/node_modules/.bin/vp. playground is not an npm workspace." >&2
  echo "From playground/, run: npm ci" >&2
  exit 1
fi

mkdir -p "$STATE" "$EVIDENCE"

if [[ -f "$PIDFILE" ]]; then
  existing=$(cat "$PIDFILE" || true)
  if [[ "$existing" =~ ^[0-9]+$ ]] && kill -0 "$existing" 2>/dev/null; then
    echo "A verification server is already running as pid ${existing}. Run scripts/cleanup.sh before launching again." >&2
    exit 1
  fi
  rm -f "$PIDFILE"
fi

if [[ -n "$(listener_pids "$PORT")" ]]; then
  echo "Port ${PORT} is already in use. Two Vite servers cannot bind the same port." >&2
  echo "Verification uses ${PORT} so it does not take the documented default 5173. Free ${PORT}, or stop the other verification run with scripts/cleanup.sh." >&2
  exit 1
fi

: >"$LOGFILE"
cd "$ROOT/playground"
# nohup keeps the server alive after this script exits. $! is the npm pid, not a process-name match.
nohup npm run dev -- --host 127.0.0.1 --port "$PORT" --strictPort >"$LOGFILE" 2>&1 &
server_pid=$!
echo "$server_pid" >"$PIDFILE"
echo "$BASE_URL" >"$BASE_URL_FILE"
cd "$ROOT"

deadline=$((SECONDS + 180))
while ((SECONDS < deadline)); do
  if ! kill -0 "$server_pid" 2>/dev/null; then
    echo "Playground dev server exited before it was ready (pid ${server_pid})." >&2
    tail -n 60 "$LOGFILE" >&2 || true
    exit 1
  fi

  html=$(curl -fsS "${BASE_URL}/" 2>/dev/null || true)
  if [[ "$html" == *'<title>pdfme Playground</title>'* ]] && grep -F "Local:   ${BASE_URL}/" "$LOGFILE" >/dev/null 2>&1; then
    echo "ready ${BASE_URL} pid ${server_pid}"
    echo "log ${LOGFILE}"
    exit 0
  fi
  sleep 0.5
done

echo "Timed out waiting for ${BASE_URL} (title pdfme Playground and Vite+ Local line)." >&2
tail -n 60 "$LOGFILE" >&2 || true
exit 1
