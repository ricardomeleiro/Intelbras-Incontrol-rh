#!/bin/sh
set -e

echo "▶ Iniciando backend Node.js..."
cd /app/backend
node server.js &

echo "▶ Iniciando Nginx..."
exec nginx -g "daemon off;"
