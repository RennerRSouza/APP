# Sistema Inteligente de Gestão de Ativos

Aplicativo móvel voltado para empresas de locação de estruturas para eventos. Utiliza Visão Computacional (YOLO) executada localmente no dispositivo para automatizar a contagem e inventário.

## Arquitetura do Monorepo

* `/frontend`: Aplicativo React Native (TypeScript).
  * `src/presentation/`: Telas, componentes visuais e navegação.
  * `src/domain/`: Regras de negócio e definição de Use Cases.
  * `src/data/`: Integração com SQLite e persistência offline.
  * `src/core/`: Motores de IA, controle de câmera e configurações globais.
* `/backend`: API construída em Python (FastAPI).

## Como Executar o Projeto

### Pré-requisitos
* [Node.js](https://nodejs.org/) (v18+) e NPM
* [Docker](https://www.docker.com/) e Docker Compose
* Ambiente Android Studio (Java, Android SDK, Emulador)

### Instalação (Método Rápido)
Execute o script de automação na raiz do projeto via terminal bash (Git Bash no Windows ou Terminal no Linux/Mac):

```bash
chmod +x build.sh
./build.sh