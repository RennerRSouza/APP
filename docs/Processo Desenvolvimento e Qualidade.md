# 5. Processo de Desenvolvimento e Qualidade — Ecossistema SIGA

Este documento registra a **metodologia de organização da equipe**, as **cerimônias e artefatos ágeis**, a **estratégia de testes e revisão de código** e os pipelines de **CI/CD, build e execução** implementados no projeto SIGA.

---

## 5.1 Metodologia de Desenvolvimento

### Scrum + Princípio da Engenharia Concorrente
O desenvolvimento foi estruturado segundo o framework ágil **Scrum**, organizado em **3 Sprints** entre **01/09/2026 e 11/12/2026** (mais uma fase planejada Pós-MVP), totalizando **81 Story Points** no Product Backlog principal do aplicativo móvel, em paralelo à construção e evolução do portal corporativo **SIGA Web Admin v1.0 / v2.0**.

Para evitar gargalos entre as frentes de Visão Computacional, Mobile e Backend, aplicou-se o **Princípio da Engenharia Concorrente**:
* O aplicativo React Native não aguardou o treinamento definitivo do modelo para ser desenvolvido: utilizou inicialmente contratos de inferência e mocks estruturados pela Clean Architecture enquanto a frente de IA anotava o dataset no Roboflow e exportava os pesos `yolo.tflite`.
* O **Contrato de Inventário JSON v2.0** (`frontend/assets/configs/event_rental_inventory.json`) atuou como interface formal entre o time de IA e o time Mobile, garantindo compatibilidade de classes (`0`–`3`) e regras de contagem antes da substituição transparente do arquivo `.tflite`.
* O **SIGA Web Admin** desenvolveu-se em branch dedicada (`epic/siga-web-admin`) integrando-se à `main` via Pull Requests após validação dos endpoints REST e modelos.

### Cerimônias e Artefatos Registrados
* **Gestão de Backlog e Planning:**
  * Backlog macro priorizado e pontuado na escala Fibonacci (`1, 2, 3, 5, 8`) consolidado em `Product_Backlog_Priorizado_—_Sistema_Inteligente_de_Gestão_de_Ativos.docx`.
  * Detalhamento da Sprint 3 gerenciado em quadro Scrum exportado no **Jira** (`jira_sprint3_scrum.csv`, contendo 5 épicos e 9 User Stories codificadas de `[IA-S3-01]` a `[QA-S3-09]`).
* **Sprint Review:**
  * Apresentação formal de entrega da Sprint 2 registrada em `Sprint_2_Review_SIGA_Completa.pptx` para a disciplina **Extensão 1** (Prof. Tiago Lacerda), documentando as 14 entregas concluídas, a estratégia de contagem por articulações (`table_joint`) e os incrementos adiantados da Sprint 3.
* **Definition of Done (DoD):**
  * Formalizada no Product Backlog com 5 critérios obrigatórios para qualquer história ser aceita:
    1. **Validação Offline:** funcionamento comprovado em modo avião (zero chamadas de rede para inferência ou gravação).
    2. **Performance:** tempo de inferência inferior a `1,5s` em dispositivo intermediário.
    3. **Consistência Visual:** marcadores/caixas alinhados à foto original sem distorção.
    4. **Persistência Auditável:** gravação no SQLite local verificável na tela de histórico.
    5. **Critérios Específicos:** atendimento integral dos requisitos da história (incluindo `npm run lint` e checagem de tipos sem erros).

### Fluxo de Versionamento e Governança Git
* **Branches por Feature/Épico (GitHub Flow):** Trabalhou-se com branches isoladas integradas à `main` via Pull Requests (registrados no histórico até o **PR #16**):
  * `feat/tsk-10-setup-arquitetura` (`PR #1`)
  * `fix/setup-arquitetura` / `Fix/setup arquivos base` (`PR #2`)
  * `feat/interface-grafica-base`, `chore/gitkeep-clean-arch`, `chore/reconfig-build-docker`
  * `feat/contrato-inventario-validador` (`PR #16`), `feat/tsk-12-camera`, `model-validation` (`PR #9`)
  * `epic/siga-web-admin` (`PR #11` e `PR #12` — entrega v1.0 e v2.0), `features-sprint2`, `ajustes-novo-modelo`, `build-ios`.
* **Padronização de Issues e PRs:** Repositório configurado com `.github/ISSUE_TEMPLATE/bug_report.md`, `.github/ISSUE_TEMPLATE/feature_request.md` e `.github/PULL_REQUEST_TEMPLATE/feature_pr.md` (contendo seções de Descrição, Mudanças Principais, Como Testar, Checklist e Notas para o Revisor).
* **Git LFS:** Configurado em `.gitattributes` para rastrear artefatos binários pesados `*.tflite` sem inflar o histórico padrão do Git.

---

## 5.2 Testes, Estratégias de Validação e CI/CD

### Cobertura de Testes Automatizados Implementados

#### 1. Frontend Mobile — Jest (`frontend/__tests__/`)
As 4 suítes de testes unitários totalizam **161 linhas** em TypeScript:
* **`yoloPostprocess.test.ts`:** Verifica filtragem por score e decodificação de caixas (`decodeYolo`), remoção de duplicatas da mesma classe preservando classes distintas no `nms`, falha explícita em shapes incompatíveis, mapeamento da classe `Gradil` (`id: 2`) com thresholds calibrados e propriedades matemáticas da função `iou`.
* **`inventoryContract.test.ts`:** Valida o arquivo `event_rental_inventory.json` via **Zod** (`validateWithZod`), confere a ordem numérica das classes (`CLASS_NAMES`) e versão (`MODEL_VERSION`), verifica que `getProductionReadinessErrors` reporta necessidade de calibração antes da produção e garante rejeição de mapas de classes incompletos.
* **`usecases.test.ts`:** Testa os casos de uso `ContarObjetos` (agregação total e por classe) e `SalvarContagem` (persistência de metadados com `sincronizado: false` e rejeição de `totalConfirmado` negativo).
* **`App.test.tsx`:** Teste de renderização básica do componente raiz `App` com `react-test-renderer`.

#### 2. Backend & SIGA Web Admin — Django TestCase / Pytest (`backend/siga_core/tests.py` e `backend/tests/test_api.py`)
As suítes automatizadas do backend somam **12 métodos de teste**:
* **`SigaCoreModelTests` (3 testes):** Valida geração automática de `codigo_yolo` via slugify e descrição em `ClasseAtivo`, atributos contratuais de `Terceirizado` (`tipo_contrato`, `dias_acesso_ano`, `data_fim_contrato`) e cálculo de divergência em `Inventario` / `ItemInventario`.
* **`SigaCoreViewTests` (8 testes):** Valida renderização MVT das rotas `dashboard`, `inventario_list`, `ativo_list`, `usuario_list` e `regras_config`; testa o ciclo completo de segurança de `DispositivoMovel` (1º login cria aparelho `AUTORIZADO`; 2º login cria aparelho `PENDENTE` retendo acesso até homologação pelo gestor; bloqueio de dispositivo `BLOQUEADO` tanto no login Web quanto na API Mobile retornando HTTP `403`, e fiscalização de inatividade $\ge 30$ dias); e executa teste de integração ponta a ponta dos **4 Pilares Corporativos** (acesso à Vitrine Pública, envio de RFQ respeitando limites e antecedência, geração automática de `HistoricoEvento`, triagem logística com marcação VIP, disparo do Digest Executivo e resposta do Webhook WhatsApp).
* **`SigaApiTests` (1 teste em `backend/tests/test_api.py`):** Valida resposta autenticada do endpoint `api_catalogo` (`GET /api/catalogo/`).

### Estratégias de Validação e Revisão
* **Revisão por Pull Requests:** Integrações principais na branch `main` realizadas via Pull Requests revisados entre os membros (14 commits explícitos de `Merge pull request` + `PR #12`, numerados até `#16`).
* **Dupla Revisão de Dataset:** Conforme especificado no backlog (`[IA-S3-01]`), as anotações de imagens no Roboflow passam por revisão cruzada de um segundo integrante antes do congelamento para treino.
* **Protocolo Experimental de Homologação em Campo (`EP07`):** Planejado na Sprint 3 com bateria cega de **50 fotos reais** em 4 estratos (galpão com baixa luz, pátio com sol intenso, cargas densas de 20 a 100 itens e oclusão parcial de até 40%), com contagem *Ground Truth* assinada por dois auditores e execução em modo avião para comprovar $\text{MAPE} \le 10,0\%$ por classe.

### CI/CD (GitHub Actions) e Automação de Build / Execução

O repositório conta com **3 workflows automatizados** em `.github/workflows/`:

| Workflow | Arquivo | Gatilho | Ambiente e Etapas Executadas |
| :--- | :--- | :--- | :--- |
| **Mobile CI** | `.github/workflows/mobile-build.yml` | Push e PR na `main` | `ubuntu-latest`, Node `22`, `npm install` em `./frontend`, execução de linter `npm run lint` (ESLint). |
| **Backend CI** | `.github/workflows/backend-test.yml` | Push e PR na `main` | `ubuntu-latest`, Python `3.11`, instalação de `backend/requirements.txt` e checagem de sintaxe `python -m py_compile src/main.py`. |
| **iOS Build (.ipa)** | `.github/workflows/ios-build.yml` | Push na `main` (`frontend/**`) ou `workflow_dispatch` | `macos-latest`, checkout com **Git LFS (`lfs: true`)**, verificação de integridade do modelo (`assets/models/yolo.tflite` $> 1\text{ MB}$), Node `22` (`npm ci`), Ruby `3.2` + CocoaPods (`bundle exec pod install`), compilação `xcodebuild` em configuração `Release` sem assinatura e upload do artefato `YoloCounterApp-ipa` (`YoloCounterApp.ipa`). |

#### Build e Execução Local do Ambiente
* **Orquestração Base (`build.sh` e `docker-compose.yaml`):** Script automatizado na raiz que sobe o container da API (`docker-compose up -d --build`) e instala as dependências Node em `frontend/`.
* **Execução do SIGA Web Admin (Django):** Ativação do ambiente Python em `backend/`, aplicação das 4 migrations (`python manage.py migrate`), carga opcional de dados de demonstração (`python manage.py popular_dados`) e inicialização com `python manage.py runserver`. Suíte de testes executada via `python manage.py test`.
* **Execução do SIGA Mobile (React Native):** Em `frontend/`, execução de `npm start` (Metro Bundler) e `npm run android` (configurado no Gradle para arquitetura **64-bits ARM** conforme commit `1bac3ec`), além de `npm test` (Jest) e `npm run lint` (ESLint).
