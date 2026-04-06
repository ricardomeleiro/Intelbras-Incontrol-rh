#!/bin/bash
set -e

# ── Configuracao ───────────────────────────────────────────
DOCKER_USER="rickdevs"
IMAGE_NAME="incontrol-rh"
TAG="latest"
FULL_IMAGE="$DOCKER_USER/$IMAGE_NAME:$TAG"

# ── Build ──────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   InControl RH — build & push            ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "► Imagem: $FULL_IMAGE"
echo ""

echo "[1/3] Building imagem Docker (frontend + backend)..."
docker build \
  --platform linux/amd64 \
  -t "$FULL_IMAGE" \
  -f Dockerfile \
  .

echo ""
echo "[2/3] Login no Docker Hub..."
docker login

echo ""
echo "[3/3] Enviando imagem para o Docker Hub..."
docker push "$FULL_IMAGE"

echo ""
echo "✓ Pronto! Imagem publicada: $FULL_IMAGE"
echo ""
echo "  Próximo passo: suba a stack no servidor usando"
echo "  o arquivo docker-compose.yml"
echo ""
