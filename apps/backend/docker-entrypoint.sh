#!/bin/sh
set -eu

# Ensure storage path exists
mkdir -p "${MEDIA_STORAGE_PATH:-/data/media}"

echo "[noto] Running migrations..."
npx prisma migrate deploy

echo "[noto] Starting server..."
node dist/server.js
