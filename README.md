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
* **JDK:** Versão **17**
* **Android Studio:** Com SDK, NDK e CMake configurados (passo a passo abaixo)

---

## Configuração do Ambiente Android

### Instalar o Android Studio e o JDK 17
1. Instale o [Android Studio](https://developer.android.com/studio).
2. Instale o **JDK 17** e confirme no terminal:
   ```bash
   java -version
   ```

### Baixar as Plataformas e Ferramentas no SDK Manager
1. Abra o Android Studio. Na tela inicial, clique em **Settings** > **Languages & Frameworks** > **Android SDK**.
2. Na aba **SDK Platforms**, expanda **Android 17.0 ("CinnamonBun" - API Level 37)** e marque:
   * `Android SDK Platform 37`
   * `Sources for Android 37`
   * `Google APIs Intel x86_64 Atom System Image`
3. Mude para a aba **SDK Tools** e selecione:
   * **Android SDK Build-Tools** (versão `37.0.0` ou a mais recente)
   * **NDK (Side by side)**
   * **CMake**
   * **Android SDK Command-line Tools (latest)**
   * **Android Emulator**
   * **Android SDK Platform-Tools**
4. Clique em **Apply** > **OK**.

### Configurar as Variáveis de Ambiente
Adicione a variável `ANDROID_HOME` e os caminhos das ferramentas ao `Path` do seu sistema operacional:

* **Windows (Variáveis de Ambiente do Sistema):**
  * Crie uma nova variável de usuário chamada `ANDROID_HOME` com o valor:
    ```text
    %LOCALAPPDATA%\Android\Sdk
    ```
  * Edite a variável `Path` e adicione as três entradas abaixo:
    ```text
    %ANDROID_HOME%\platform-tools
    %ANDROID_HOME%\emulator
    %ANDROID_HOME%\cmdline-tools\latest\bin
    ```
  * Reabra o terminal e valide com `adb --version`.

* **Linux / macOS (`~/.bashrc`):**
  ```bash
  export ANDROID_HOME=$HOME/Android/Sdk   # No macOS use: $HOME/Library/Android/sdk
  export PATH=$PATH:$ANDROID_HOME/emulator
  export PATH=$PATH:$ANDROID_HOME/platform-tools
  export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
  ```
  * Recarregue o perfil (`source ~/.zshrc`) e valide com `adb --version`.

  ### Preparar o Dispositivo de Teste
* **Opção A — Celular Físico:**
  2. Acesse **Opções do desenvolvedor** e ative a **Depuração USB**.
  3. Conecte o cabo USB, aceite a chave RSA na tela do aparelho e confirme a conexão no terminal:
     ```bash
     adb devices
     ```
* **Opção B — Emulador Virtual (AVD):**
  1. No Android Studio, abra **Device Manager**.
  2. Clique em **Create Device**, escolha um perfil de hardware (ex:**Pixel 10**), selecione a imagem de sistema **API 37** e clique em **Finish**.

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
# Rodar validadores (Lint + TypeCheck)
docker compose --profile test run --rm frontend-check
```