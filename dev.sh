#!/usr/bin/env bash
# Startet API-Server (PHP) und Frontend (Vite) gemeinsam. Beenden mit Strg+C.
#   API_PORT=8080 FRONTEND_PORT=5173 ./dev.sh
set -euo pipefail

cd "$(dirname "$0")"
API_PORT="${API_PORT:-8080}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"

[ -d api/vendor ] || (cd api && composer install)
[ -d frontend/node_modules ] || (cd frontend && npm install)

if [ ! -s api/data/users.json ]; then
  echo "Hinweis: noch kein Benutzer angelegt. Für Sync z. B.:"
  echo "  api/bin/console user:create ich@example.org && api/bin/console token:create ich@example.org"
  echo
fi

# Beim Beenden alle Kindprozesse (inkl. Enkel wie node/vite) mitbeenden
kill_tree() {
  local child
  for child in $(pgrep -P "$1"); do kill_tree "$child"; done
  kill "$1" 2>/dev/null || true
}
cleanup() {
  trap - INT TERM EXIT
  for child in $(pgrep -P $$); do kill_tree "$child"; done
}
trap cleanup INT TERM EXIT

php -S "localhost:${API_PORT}" -t api/public api/public/index.php 2>&1 | sed -u 's/^/[api] /' &
(cd frontend && npx vite --port "${FRONTEND_PORT}" --strictPort) 2>&1 | sed -u 's/^/[web] /' &

echo "API:      http://localhost:${API_PORT}"
echo "Frontend: http://localhost:${FRONTEND_PORT}"
wait
