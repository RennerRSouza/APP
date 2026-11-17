# 2. Diagrama de Caso de Uso — Ecossistema SIGA (Mobile + Web Admin)

Este documento apresenta o **Diagrama de Caso de Uso Geral** integrando o aplicativo móvel offline-first (**SIGA Mobile**) e a plataforma administrativa corporativa (**SIGA Web Admin v2.0**), seguido da matriz de rastreabilidade entre atores, casos de uso, histórias de usuário (`US`), requisitos (`RF`) e regras de negócio (`RN`).

---

## 2.1 Diagrama de Caso de Uso (Mermaid)

```mermaid
flowchart LR
    %% Atores do Ecossistema
    Dono(["Dono / Administrador\n(Gestor Executivo)"])
    Gerente(["Gerente Operacional\n/ Auditor"])
    Func(["Funcionário Interno\n(Operador de Campo)"])
    Terc(["Terceirizado Temporário\n(Operador Restrito)"])
    Cliente(["Cliente Externo\n(Solicitante de Locação)"])
    Hardware(["Dispositivo Móvel\n(Hardware X-Device-UUID)"])

    %% Subsistema 1: SIGA Mobile
    subgraph SUB_MOBILE ["SIGA Mobile (App React Native Offline-First)"]
        direction TB
        UC_M01("UC-M01: Autenticar Operador\ne Cache de Sessão Offline")
        UC_M02("UC-M02: Capturar Foto\nou Selecionar da Galeria")
        UC_M03("UC-M03: Validar Nitidez\ne Pré-visualizar Imagem")
        UC_M04("UC-M04: Executar Inferência\nYOLO26n / TFLite Offline")
        UC_M05("UC-M05: Conferir Marcadores\ne Ajustar Contagem")
        UC_M06("UC-M06: Registrar Justificativa\nObrigatória (> 10%)")
        UC_M07("UC-M07: Salvar Lote no SQLite\ncom GPS e Inclinação")
        UC_M08("UC-M08: Consultar Histórico\ne Abrir Local no Maps")
    end

    %% Subsistema 2: SIGA Web Admin v2.0 + API
    subgraph SUB_WEB ["SIGA Web Admin v2.0 (Portal Django MVT + API REST)"]
        direction TB
        UC01("UC01: Cadastrar e Gerenciar\nUsuários e Sub-usuários (RBAC)")
        UC02("UC02: Configurar Regras Móveis\nVersionadas por Perfil")
        UC03("UC03: Gerenciar Catálogo de\nAtivos e Limites da Vitrine")
        UC04("UC04: Consultar Dashboard e Auditar\nInventários (Log Imutável)")
        UC05("UC05: Sincronizar Lotes Offline\ne Validar Hardware")
        UC06("UC06: Homologar ou Bloquear\nDispositivos Móveis")
        UC07("UC07: Consultar Vitrine Pública\ne Enviar RFQ (Pilar 1)")
        UC08("UC08: Conduzir Triagem Logística\ne Alertas VIP (Pilar 1)")
        UC09("UC09: Gerenciar Central de Notificações\ne Digest Executivo (Pilar 2)")
        UC10("UC10: Atender via Webhook\nWhatsApp Bot (Pilar 3)")
    end

    %% Relações Atores -> SIGA Mobile
    Func --> UC_M01
    Func --> UC_M02
    Func --> UC_M05
    Func --> UC_M08
    Terc --> UC_M01
    Terc --> UC_M02
    Terc --> UC_M05
    Hardware -.-> UC_M02
    Hardware -.-> UC_M07

    %% Relações internas Mobile (include / extend)
    UC_M02 -. "<<include>>" .-> UC_M03
    UC_M03 -. "<<include>>" .-> UC_M04
    UC_M04 -. "<<include>>" .-> UC_M05
    UC_M06 -. "<<extend>>\n(divergência > margem)" .-> UC_M05
    UC_M05 -. "<<include>>" .-> UC_M07
    UC_M07 -. "<<include>>\n(ao reconectar)" .-> UC05

    %% Relações Atores -> SIGA Web Admin
    Dono --> UC01
    Dono --> UC02
    Dono --> UC04
    Dono --> UC06
    Dono --> UC09

    Gerente --> UC01
    Gerente --> UC03
    Gerente --> UC04
    Gerente --> UC06
    Gerente --> UC08
    Gerente --> UC09

    Func --> UC05
    Terc --> UC05
    Hardware --> UC05

    Cliente --> UC07
    Cliente --> UC10

    %% Relações internas Web Admin
    UC05 -. "<<include>>\n(valida X-Device-UUID)" .-> UC06
    UC05 -. "<<include>>\n(vincula versão)" .-> UC02
    UC10 -. "<<extend>>\n(opção 3: link pré-identificado)" .-> UC07
    UC08 -. "<<include>>\n(se cliente VIP)" .-> UC09
```

> **Nota de Herança de Papéis:** Em campo, tanto o **Funcionário Interno** quanto o **Terceirizado Temporário** atuam como *Operadores Móveis*, sendo diferenciados pelas políticas de conferência configuradas no `UC02` (limite padrão de `20%` para Funcionários e `5%` para Terceirizados) e pelas permissões de acesso ao histórico no aplicativo (`US-27`). No portal administrativo, o **Dono / Administrador** concentra as decisões estratégicas de empresa e regras, enquanto o **Gerente Operacional** executa a auditoria diária, o catálogo de ativos e a triagem logística.

---

## 2.2 Matriz de Rastreabilidade dos Casos de Uso

| ID | Caso de Uso | Subsistema | Atores Envolvidos | Histórias / Requisitos Associados | Regras de Negócio |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **UC-M01** | Autenticar Operador e Sessão | Mobile / API | Funcionário, Terceirizado | `US-26`, `US-27`, `US-28`, `RF-MOB-07` | `RN-01` (RBAC), `RN-06` (Device Check) |
| **UC-M02 / UC-M03** | Capturar Foto, Galeria e Validar Nitidez | Mobile | Operador, Hardware (Câmera/Sensores) | `US-06`, `US-07`, `US-08`, `RF-MOB-01` | Padrão angular e prevenção de foto borrada |
| **UC-M04** | Executar Inferência YOLO26n Offline | Mobile | Operador (via App) | `US-09` a `US-13`, `RF-MOB-02`, `RF-MOB-03` | `RNF-MOB-01` (100% Offline), `RNF-MOB-03` ($\text{MAPE} \le 10\%$) |
| **UC-M05 / UC-M06** | Conferir, Ajustar e Justificar Divergência | Mobile | Operador | `US-14` a `US-17`, `RF-MOB-04`, `RF-MOB-05` | `RN-03` (Justificativa obrigatória $> 10\%$) |
| **UC-M07 / UC-M08** | Persistir SQLite com GPS e Consultar Histórico | Mobile | Funcionário, Terceirizado (sem histórico) | `US-22` a `US-25`, `RF-MOB-06` | `RNF-MOB-01` (Offline-First) |
| **UC01** | Cadastrar e Gerenciar Usuários e Sub-usuários | Web Admin | Dono / Admin, Gerente | `RF001` | `RN-01` (RBAC), `RN-02` (CPF/E-mail únicos) |
| **UC02** | Configurar Regras Móveis Versionadas | Web Admin | Dono / Admin | `RF002` | `RN-03` (Limites diferenciados), `RN-08` (Versionamento) |
| **UC03** | Gerenciar Catálogo de Ativos e Classes | Web Admin | Gerente Operacional | `RF003` | `RN-04` (Padronização de catálogo e `codigo_yolo`) |
| **UC04** | Consultar Dashboard e Auditar Inventários | Web Admin | Dono / Admin, Gerente / Auditor | `RF004`, `RF005` | `RN-05` (Trilha imutável `LogAuditoria`) |
| **UC05 / UC06** | Sincronizar Inventários e Homologar Dispositivos | Mobile $\leftrightarrow$ API/Web | Operador, Hardware, Gestor | `RF006`, `RNF-WEB-03` | `RN-06` (1º Autorizado, 2º+ Pendente), `RN-07` (Idempotência) |
| **UC07 / UC08** | Vitrine Pública RFQ e Triagem Logística | Web Admin (Pilar 1) | Cliente Externo, Gerente | `RF007` (Pilar 1) | Validação de limites de estoque e antecedência mínima; `HistoricoEvento` |
| **UC09** | Central de Notificações e Digest Executivo | Web Admin (Pilar 2 & 4) | Dono / Admin, Gerente | `RF007` (Pilares 2 e 4) | Filtro anti-ruído (Digest) e trilha `HistoricoEvento` |
| **UC10** | Atendimento Automático Webhook WhatsApp | API Web (Pilar 3) | Cliente Externo | `RF007` (Pilar 3) | Menu 3 opções e auditoria de interações em `HistoricoEvento` |
