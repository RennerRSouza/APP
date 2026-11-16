#!/usr/bin/env bash
set -e

# 1. Define o comando do Docker Compose (suporta v2 'docker compose' e legado 'docker-compose')
if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
else
  COMPOSE_CMD="docker-compose"
fi

echo "[1/4] Subindo o Backend (SIGA Web Admin - Django) via Docker..."
$COMPOSE_CMD up -d --build backend

echo "[2/4] Aplicando migrações do banco de dados..."
$COMPOSE_CMD exec -T backend python manage.py migrate --noinput

echo "[3/4] Verificando e sincronizando modelo yolo.tflite..."
if [ -f "frontend/assets/models/yolo.tflite" ]; then
  mkdir -p frontend/android/app/src/main/assets
  cp -f frontend/assets/models/yolo.tflite frontend/android/app/src/main/assets/yolo.tflite
  echo "  -> Modelo yolo.tflite sincronizado com sucesso."
else
  echo "  -> AVISO: frontend/assets/models/yolo.tflite não encontrado!"
fi

echo "[4/4] Instalando dependências do Frontend (React Native)..."
cd frontend
if [ -f "package-lock.json" ]; then
  npm ci
else
  npm install
fi

echo ""
echo "Ambiente configurado com sucesso!"
echo "----------------------------------------------------"
echo "Painel Web Admin:  http://localhost:8000"
echo "Iniciar Metro:     cd frontend && npm start"
echo "Rodar no Android:  cd frontend && npm run android"
echo "Validar CI local:  $COMPOSE_CMD --profile test run --rm frontend-check"
echo "----------------------------------------------------"