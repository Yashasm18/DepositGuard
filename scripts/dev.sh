#!/usr/bin/env bash
#
# Start both halves of DepositGuard and stop them together.
#
#   npm start
#
# The app needs two processes — the Python API on 8787 and Vite on 5173 —
# and forgetting the API is what makes the website look broken: every /api
# call comes back 502 and the UI can only say it cannot reach the server.
#
# cd's to the repo root itself, so it works from any directory.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

if [ ! -x server/.venv/bin/uvicorn ]; then
  echo "server/.venv is missing. Create it once with:"
  echo "  python3 -m venv server/.venv"
  echo "  server/.venv/bin/pip install -r server/requirements.txt"
  exit 1
fi

for port in 8787 5173; do
  if lsof -nP -iTCP:"$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "Port $port is already in use. Stop whatever is on it first:"
    echo "  kill \$(lsof -nP -iTCP:$port -sTCP:LISTEN -t)"
    exit 1
  fi
done

# Kill the whole process group on exit, so Ctrl-C takes the API down too
# rather than leaving it holding 8787 for the next run.
trap 'kill 0 2>/dev/null || true' EXIT INT TERM

echo "API  → http://localhost:8787"
echo "App  → http://localhost:5173"
echo

( cd server && .venv/bin/uvicorn app:app --port 8787 ) &
npm run dev

