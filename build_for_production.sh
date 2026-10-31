#!/usr/bin/env bash
# Baut das Frontend und kopiert es nach api/public, sodass API und App vom selben Server ausgeliefert werden.
set -euo pipefail

cd "$(dirname "$0")"

(cd frontend && npm ci && npm run build)

# Alte Build-Artefakte entfernen (index.php bleibt erhalten)
rm -rf api/public/assets api/public/index.html
cp -R frontend/dist/. api/public/

echo "Frontend nach api/public kopiert."
