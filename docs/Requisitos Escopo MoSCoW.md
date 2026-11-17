# 2. Requisitos e Escopo — Sistema Inteligente de Gestão de Ativos (SIGA)

Este documento consolida os **requisitos críticos**, **perfis de usuário**, **priorização técnica** e a **matriz MoSCoW** do ecossistema **SIGA**, abrangendo tanto o aplicativo móvel offline-first (**SIGA Mobile** em React Native + TFLite) quanto a plataforma administrativa e de integração (**SIGA Web Admin v2.0** em Django + DRF).

---

## 2.1 Principais Requisitos Críticos

### A. Requisitos Funcionais Críticos — SIGA Mobile (`RF-MOB`)

| Código | Requisito Funcional | Descrição e Valor de Negócio | Referência |
| :--- | :--- | :--- | :--- |
| **RF-MOB-01** | **Captura e Seleção de Imagens com Telemetria** | Permitir capturar fotografias pela câmera nativa (foco automático, flash/lanterna e leitura dos sensores de inclinação `cameraPitch` / `cameraRoll`) ou selecionar imagens da galeria, com tela de pré-visualização para descarte imediato de fotos borradas ou tremidas. | `US-06`, `US-07`, `US-08` |
| **RF-MOB-02** | **Pré-processamento e Inferência 100% Offline (YOLO)** | Redimensionar a foto para `640×640` via *letterbox* proporcional normalizado (`Float32Array`) e executar o modelo quantizado `yolo.tflite` (v14 / YOLO26n) localmente via `react-native-fast-tflite`, aplicando decodificação e NMS segmentado por classe (`IoU = 0.60` para `Gradil` e `0.45` para as demais classes). | `US-09`, `US-10`, `US-11`, `US-12` |
| **RF-MOB-03** | **Contagem Inteligente por Classe e Articulações** | Contabilizar automaticamente `Black-Fold-Table`, `Brown-Fold-Table` e `Gradil`, utilizando o pareamento de articulações laterais (`table_joint`: 2 articulações = 1 mesa dobrável empilhada via `Math.ceil(count / 2)`) e regras do Contrato de Inventário v2.0 (`event_rental_inventory.json`). | `US-05`, `US-13` |
| **RF-MOB-04** | **Conferência Visual Limpa e Ajuste Manual** | Exibir marcadores circulares coloridos centralizados sobre cada detecção (`DetectionOverlay`), com suporte a zoom por pinça (*pinch-to-zoom*), placar detalhado por classe (`PlacarDeteccoes`) e botões rápidos (`+` / `−`) para ajuste da contagem total (e evolução prevista na Sprint 3 para toque direto nos pontos). | `US-14`, `US-15`, `US-16`, `US-17` |
| **RF-MOB-05** | **Trava de Auditoria (Margem de 10%)** | Calcular em tempo real a divergência percentual entre a contagem da IA e a contagem confirmada pelo operador; quando a alteração superar **10,0%**, bloquear o salvamento comum, exibir alerta visual e exigir **justificativa textual obrigatória**. | `useContagemFlow`, `ResultScreen`, `RN-03` |
| **RF-MOB-06** | **Persistência Local Offline e Geolocalização** | Gravar os lotes de contagem em banco relacional local SQLite (`@op-engineering/op-sqlite`) com UUID próprio (idempotência), totais IA vs. Humano, mapa por classe, justificativa, inclinação da câmera, coordenadas GPS (`latitude`, `longitude`), endereço resolvido e atalho direto para o Google Maps no histórico. | `US-22`, `US-23`, `US-24`, `US-25` |
| **RF-MOB-07** | **Autenticação e Sincronização Assíncrona** | Autenticar operadores no backend e sincronizar lotes pendentes do SQLite para a API REST (`/api/sincronizar/`), enviando credenciais e cabeçalho de hardware `X-Device-UUID` / `X-Device-Model` via `DjangoSyncDataSource`. | `US-26`, `US-27`, `US-28`, `UC05` |

### B. Requisitos Funcionais Críticos — SIGA Web Admin v2.0 (`RF-WEB`)

| Código | Requisito Funcional | Descrição e Valor de Negócio | Referência |
| :--- | :--- | :--- | :--- |
| **RF001** | **Gestão de Usuários, Sub-usuários e RBAC** | Cadastrar, listar e ativar/inativar usuários vinculados à `Empresa`, diferenciando `GESTOR`, `FUNCIONARIO` (com `matricula` única e `departamento`) e `TERCEIRIZADO` (com `empresa_prestadora`, `tipo_contrato` — Diária/Temporário/Anual, `dias_acesso_ano` e `data_fim_contrato`). | `UC01`, `RN-01`, `RN-02` |
| **RF002** | **Regras Operacionais Versionadas por Perfil** | Parametrizar limites móveis separados por tipo de operador (`Funcionário`: padrão `20,0%` de edição manual; `Terceirizado`: padrão `5,0%` de edição manual), margem para auditoria (`10,0%`), obrigatoriedade de justificativa e janela horária, incrementando o número de `versao` a cada atualização e vinculando a regra aplicada ao inventário (`regra_operacional`). | `UC02`, `RN-03`, `RN-08` |
| **RF003** | **Gestão do Catálogo de Ativos e Classes** | Cadastrar e editar classes homologadas pela empresa (ex.: `Mesa Bistrô`, `Gradil`), com geração automática do `codigo_yolo`, categoria, descrição técnica, imagem de referência e limites mínimo/máximo por solicitação (`limite_minimo_itens`, `limite_maximo_itens`), expondo o catálogo em `/api/catalogo/`. | `UC03`, `RN-04` |
| **RF004** | **Dashboard Analítico em Tempo Real** | Apresentar KPIs consolidados da empresa: total de inventários recebidos, quantidade de lotes `DIVERGENTE`, `EM_ANALISE` e `APROVADO`, taxa percentual de conformidade da IA, totais de ativos, dispositivos e usuários, além dos 5 inventários mais recentes. | `DashboardView` |
| **RF005** | **Consulta e Auditoria Imutável de Inventários** | Filtrar inventários por status (`EM_ANALISE`, `DIVERGENTE`, `APROVADO`, `REJEITADO`), inspecionar itens (`qtd_detectada_ia`, `qtd_confirmada_humano`, `divergencia_percentual`, justificativa, foto) e registrar parecer formal obrigatório (`APROVAR` ou `REJEITAR`) gravando histórico em `LogAuditoria`. | `UC04`, `RN-05` |
| **RF006** | **Homologação e Controle de Dispositivos Móveis** | Gerenciar `DispositivoMovel` via `uuid_dispositivo`: o 1º dispositivo utilizado por um usuário nasce `AUTORIZADO`, o 2º+ nasce `PENDENTE` bloqueando login/sincronização até liberação do gestor; suporta bloqueio manual (`BLOQUEADO`) e indicador de inatividade ($\ge 30$ dias sem atuação). | `UC05`, `RN-06` |
| **RF007** | **Expansão Corporativa (4 Pilares Web v2.0)** | **Pilar 1 (Vitrine RFQ):** Portal público `/portal/<subdominio>/` para clientes enviarem manifestações de interesse com esteira de triagem logística (`SolicitacaoInteresse`, `ParametrosLocacao`) e flag VIP; **Pilar 2 (Notificações):** Mural interno, alertas críticos e geração de *Digest Executivo Diário*; **Pilar 3 (WhatsApp Bot):** Webhook `/api/webhooks/whatsapp/` com menu automatizado (1: regras/região, 2: catálogo, 3: link pré-identificado para RFQ); **Pilar 4 (Audit Trail):** Registro imutável de eventos em `HistoricoEvento`. | `siga_core` Pilares 1–4 |

### C. Requisitos Não Funcionais Críticos (`RNF`)

| Código | Categoria | Especificação Crítica |
| :--- | :--- | :--- |
| **RNF-MOB-01** | **Disponibilidade Offline** | A captura, o pré-processamento, a inferência TFLite, a conferência e o armazenamento SQLite devem operar **100% offline** (comprovado em modo avião), sem chamadas de rede obrigatórias no campo. |
| **RNF-MOB-02** | **Desempenho e Memória Mobile** | Tempo de inferência do modelo inferior a **1,5 segundos** (e resposta ponta a ponta $< 2,0\text{s}$) em smartphone intermediário ARM64; decodificação e redimensionamento para `640×640` com limpeza de arquivo temporário para evitar *Out-Of-Memory (OOM)*. |
| **RNF-MOB-03** | **Precisão Estatística (IA)** | O modelo embarcado deve atingir Erro Percentual Médio Absoluto ($\text{MAPE}$) $\le \mathbf{10,0\%}$ frente ao gabarito real (*Ground Truth*) nas condições homologadas de validação em campo. |
| **RNF-WEB-01** | **Arquitetura MVT e Usabilidade** | O painel administrativo deve seguir a arquitetura **Model-View-Template (MVT)** do Django, com interface responsiva para desktops e tablets e carregamento do dashboard inferior a **3 segundos** sob carga normal. |
| **RNF-WEB-02** | **Segurança, RBAC e Hardware** | Autenticação com hash criptográfico nativo do Django (PBKDF2), proteção CSRF nas rotas MVT, controle de sessão/Basic Auth nas APIs DRF e validação obrigatória de hardware (`X-Device-UUID`) no login web, login API e sincronização. |
| **RNF-WEB-03** | **Idempotência e Atomicidade** | A sincronização (`/api/sincronizar/`) deve ser idempotente via UUID gerado no celular (`update_or_create`) e executada dentro de bloco `@transaction.atomic`, retornando `HTTP 201 Created`, `HTTP 403 Forbidden` (dispositivo bloqueado/pendente) ou `HTTP 422 Unprocessable Entity` (violação de regra). |
| **RNF-WEB-04** | **Isolamento Multi-Tenant e Auditoria** | Segregação lógica estrita por `Empresa` (`schema_name` e `subdominio`, com queries filtradas por `empresa` e preparada para evolução em schemas PostgreSQL) e trilhas de auditoria protegidas (`LogAuditoria` e `HistoricoEvento`). |

---

## 2.2 Perfis de Usuário e Casos de Uso / User Stories de Maior Valor

| Perfil de Usuário | Canal Principal | Responsabilidades e Restrições de Acesso | Casos de Uso / User Stories de Maior Valor |
| :--- | :--- | :--- | :--- |
| **Dono / Administrador da Locadora** (`GESTOR`) | SIGA Web Admin (Browser) | Realiza o onboarding da empresa (`/cadastro-empresa/`), configura parâmetros operacionais de Funcionários e Terceirizados, gerencia usuários/contratos, consulta KPIs, recebe *Digest Executivo Diário* e aprova/bloqueia dispositivos. | `UC01`, `UC02`, `UC04`, `RF004`, Pilar 2 (Digest Executivo e Alertas VIP) |
| **Gerente Operacional / Auditor** (`GESTOR`) | SIGA Web Admin (Browser) | Opera o painel no dia a dia: mantém o catálogo de ativos e limites da vitrine, homologa aparelhos `PENDENTE`, audita lotes `DIVERGENTE` emitindo parecer formal e conduz a esteira de triagem logística das RFQs. | `UC03`, `UC04`, `UC05` (Homologação), Triagem Logística (Pilar 1) |
| **Funcionário Interno** (`FUNCIONARIO`) | SIGA Mobile (App Offline) e Web Consulta | Executa contagens em galpões e eventos com regra operacional mais flexível (padrão até `20%` de edição manual, justificando acima da margem de `10%`). Registra matrícula e departamento. Na evolução da Sprint 3 (`US-27`), consulta histórico recente sem poder excluir registros. | `US-06` a `US-17`, `US-22` a `US-25`, `UC05` (Sincronização) |
| **Terceirizado Temporário** (`TERCEIRIZADO`) | SIGA Mobile (App Restrito) | Prestador vinculado a empresa externa, tipo de contrato, cota anual de dias e data de expiração. Opera sob teto rígido (padrão `5%` de edição manual com justificativa obrigatória acima da margem) e sem acesso administrativo ou exclusão de histórico. | `US-06` a `US-17`, `US-26` a `US-28`, `UC05` (Sincronização controlada) |
| **Cliente Externo / Solicitante** | Vitrine Pública Web (`/portal/<subdominio>/`) e WhatsApp | Consulta regras de entrega/região e catálogo disponível via atendimento automático no WhatsApp (opções 1, 2 e 3) e envia Manifestação de Interesse (RFQ) com quantidades, datas e endereço do evento. | Atendimento Bot WhatsApp (Pilar 3) e Envio de RFQ na Vitrine (Pilar 1) |

---

## 2.3 Priorização de Requisitos e Matriz MoSCoW

### Estratégia de Priorização
A priorização do projeto seguiu o **caminho crítico de engenharia** definido no *Product Backlog Priorizado* (`81 Story Points` distribuídos em 8 épicos e 30 User Stories) em conjunto com o escopo do **SIGA Web Admin v2.0**:
1. **Núcleo Técnico de Maior Risco Primeiro (51,9% do esforço — 42 SP):** validação do modelo de Visão Computacional (`EP03`), captura de imagens sem estouro de memória (`EP02`) e motor de inferência TFLite 100% offline (`EP04`).
2. **Mitigação Operacional e Persistência Offline (18 SP):** conferência visual limpa com zoom/ajustes (`EP05`), banco SQLite local com telemetria/GPS (`EP06`) e controle de acesso (`EP01`).
3. **Governança Corporativa e Homologação (Web Admin + `EP07`):** painel administrativo Django multi-tenant, validação de regras por perfil, homologação de hardware e protocolo de testes de campo ($\text{MAPE} \le 10\%$).
4. **Automação Comercial e Evolução Contínua (`EP08` + Pilares 1–4):** vitrine RFQ, notificações/digest, webhook WhatsApp e coleta automatizada para retreinamento Pós-MVP.

### Matriz MoSCoW Resumida por Equipe e Sócios

* **Legenda das Iniciais:**
  * **`V` (Vinícius):** Treinamento e anotação de IA, Contrato do Modelo e **SIGA Web Admin** (Core e v2.0).
  * **`R` (Renner):** Git, CI/CD, estrutura básica do projeto/tecnologias e **Frontend Mobile** (React Native / Android / TFLite / SQLite).
  * **`H` (Hemilly):** **Frontend e Build de iOS** (`.ipa` / Release / Git LFS) e **anotação de imagens** do dataset.
  * **`J` (Sócio — Android):** Mínimo exigido pelo MVP para operação em campo e homologação no Android.
  * **`A` (Sócio — iPhone):** Mínimo exigido pelo MVP para operação em campo + compatibilidade no iPhone (iOS).

| ID | Requisito / Funcionalidade (Resumido) | Área / Foco | Grau de Importância (MoSCoW) | Iniciais | V | R | H | J | A | Observação |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **RF01** | Anotação do Dataset e Data Augmentation (Mesas, Articulações e Gradil) | IA & Dataset | **Must Have** | `V, H, J, A` | V | | H | J | A | Base mínima para a IA reconhecer o estoque real |
| **RF02** | Treinamento YOLO26n (v14), Exportação TFLite e Contrato JSON v2 | IA & Motor | **Must Have** | `V, R, J, A` | V | R | | J | A | Núcleo de detecção offline com meta de erro $\le 10\%$ |
| **RF03** | Estrutura Base do Monorepo, Clean Architecture, Tecnologias e Git/CI | Estrutura & Git | **Must Have** | `R, V, H` | V | R | H | | | Fundação técnica, padronização de branches, PRs e LFS |
| **RF04** | Captura Nativa (Câmera e Galeria), Preview de Nitidez e Letterbox 640x640 | Frontend Mobile | **Must Have** | `R, H, J, A` | | R | H | J | A | Fluxo mínimo de entrada de fotos sem travar memória |
| **RF05** | Contagem 100% Offline no Celular (Mesas por Articulações + Gradil via NMS) | Frontend & IA | **Must Have** | `V, R, H, J, A` | V | R | H | J | A | Funcionalidade central do MVP em galpões sem internet |
| **RF06** | Conferência Visual (Pontos Coloridos, Zoom de Pinça, Ajuste `+/-` e Trava $>10\%$) | Frontend Mobile | **Must Have** | `V, R, H, J, A` | V | R | H | J | A | Revisão rápida em campo e trava antifraude mínima |
| **RF07** | Persistência Local SQLite e Histórico de Contagens no Aparelho | Frontend & Dados | **Must Have** | `R, J, A` | | R | | J | A | Armazenamento local obrigatório para operação offline |
| **RF08** | Homologação em Campo (50 Fotos, $\text{MAPE} \le 10\%$) e Build Android (APK) | Qualidade & Android | **Must Have** | `V, R, H, J` | V | R | H | J | | Entrega mínima validada no celular Android (Sócio J) |
| **RF09** | Compatibilidade e Build do App Mobile para iOS / iPhone (`.ipa`) | Frontend iOS | **Should Have** | `R, H, A` | | R | H | | A | Necessário para uso no iPhone (Sócio A) e pipeline iOS |
| **RF10** | Telemetria de Campo (Inclinação e GPS c/ Google Maps), Filtros e Toque na Foto | Frontend Mobile | **Should Have** | `R, H, J, A` | | R | H | J | A | Melhoria ergonômica e rastreabilidade geográfica do lote |
| **RF11** | Login Mobile Offline e Controle de Acesso por Perfil (Admin, Func, Terc) | Segurança Mobile | **Should Have** | `V, R, J, A` | V | R | | J | A | Identificação individual do conferente em campo |
| **RF12** | SIGA Web Admin Core (Painel Gestor, Usuários, Catálogo, Regras e Auditoria) | Web Admin (Extra) | **Could Have** | `V` | V | | | | | Foi além do MVP mínimo mobile (governança centralizada) |
| **RF13** | SIGA Web Admin v2.0 (Vitrine Pública RFQ, Bot WhatsApp e Digest Executivo) | Web Admin (Extra) | **Could Have** | `V` | V | | | | | Expansão comercial e executiva além do escopo mínimo |
| **RF14** | Retreino Automático em Nuvem via Wi-Fi (MLOps) e Rastreio Unitário por RFID | Pós-MVP / Fora | **Won't Have** | `V, R, H, J, A` | V | R | H | J | A | Conscientemente fora do escopo do MVP 1 (Pós-11/Dez) |
