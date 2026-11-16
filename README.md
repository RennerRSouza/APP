# SIGA — Sistema Inteligente de Gestão de Ativos

Aplicativo móvel com Visão Computacional embarcada (100% offline) e painel administrativo web (SIGA Web Admin) voltados para empresas de locação de estruturas para eventos, automatizando a contagem, conferência e auditoria de ativos empilhados em galpões e eventos.

## Arquitetura do Monorepo

```text
siga/
├── .github/workflows/          # Pipelines de CI/CD
├── backend/                    # SIGA Web Admin & API de Sincronização (Django)
│   ├── siga_core/              # Models, Migrations, Views e Comandos
│   ├── templates/              # Interface Web Administrativa
│   ├── Dockerfile              # Imagem de desenvolvimento/produção do Backend
│   └── requirements.txt        # Dependências Python
├── frontend/                   # Aplicativo Mobile Offline (React Native + TypeScript)
│   ├── ios/                    # Projeto nativo ios
│   ├── android/                # Projeto nativo Android
│   ├── assets/
│   │   └── models/             # Modelo treinado yolo.tflite
│   ├── src/
│   │   ├── core/               # DI Container, pipeline YOLO, validadores Zod, sensores e GPS
│   │   ├── data/               # SQLite DataSource (@op-engineering/op-sqlite), Sync API e Repositórios
│   │   ├── domain/             # Entidades e Casos de Uso (ContarObjetos, SalvarContagem)
│   │   └── presentation/       # Telas (Home, Camera, Result, History), Navegação e DetectionOverlay
│   ├── Dockerfile              # Container de CI local (ESLint + TypeScript)
├── build.sh                    # Script de automação do ambiente de desenvolvimento
└── docker-compose.yaml         # Orquestração do Backend e do profile de testes do Frontend
```

---

## Pré-requisitos

* **Node.js:** `>= 22.11.0`
* **Docker & Docker Compose:** v2+
* **Ambiente Nativo Android:** JDK 17, Android Studio, Android SDK e Emulador ou dispositivo físico com Depuração USB ativada

---

## Como Executar o Projeto

### 1. Configuração Rápida
Na raiz do repositório execute o script de automação via terminal Bash (Git Bash no Windows ou Terminal no Linux/macOS):

```bash
chmod +x build.sh
./build.sh
```
---

### 2. Execução Manual por Serviço

#### **Backend — SIGA Web Admin (Django)**

```bash
docker compose up -d
```
* **Painel Administrativo:** `http://localhost:8000`
* **Endpoint de Sincronização Mobile:** `http://localhost:8000/api/sincronizar/`
* **Comandos úteis:**
  ```bash
  # Aplicar migrações
  docker compose exec backend python manage.py migrate

  # Popular banco com dados e usuário administrador iniciais
  docker compose exec backend python manage.py popular_dados

  # Acompanhar logs em tempo real
  docker compose logs -f backend
  ```

#### **Frontend — Aplicativo Mobile (React Native)**
> **Atenção:** Sempre que atualizar o arquivo `frontend/assets/models/yolo.tflite`, copie-o também para `frontend/android/app/src/main/assets/yolo.tflite` antes de compilar.

```bash
cd frontend

# Terminal: Compila e instala o app no emulador/dispositivo Android
npm run android
```

---

## Qualidade de Código e Testes

```bash
# Construir a imagem de validação (necessário apenas ao alterar package.json)
docker compose --profile test build --no-cache frontend-check
# Rodar a bateria completa (Lint + TypeCheck)
docker compose --profile test run --rm frontend-check
```