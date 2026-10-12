set -e

echo "Iniciando o ambiente de desenvolvimento"

echo "Subindo o Backend (FastAPI) via Docker"
docker-compose up -d --build

echo "Instalando dependências do Frontend (React Native)"
cd frontend
npm install

echo "Ambiente configurado"
echo "----------------------------------------------------"
echo "Para iniciar o servidor Metro do Frontend, execute:"
echo "  cd frontend && npm start"
echo "Para compilar o aplicativo no emulador Android, execute:"
echo "  cd frontend && npm run android"
echo "----------------------------------------------------"