# 2. Diagramas de Processos de Negócio (BPDs) — Ecossistema SIGA

Este documento modela os **três processos de negócio centrais** do ecossistema SIGA utilizando notação de fluxo por raias (*swimlanes*) em Mermaid, cobrindo desde a operação em campo 100% offline no **SIGA Mobile** até a auditoria corporativa, gestão de dispositivos e esteira comercial no **SIGA Web Admin v2.0**.

---

## BPD 01 — Contagem, Conferência e Persistência em Campo (100% Offline)

Descreve o fluxo ponta a ponta executado pelo operador no galpão ou evento sem dependência de conexão com a internet, contemplando telemetria de sensores, inferência TFLite, contagem assistida por articulações (`table_joint`) e trava de auditoria para divergências superiores a `10,0%`.

```mermaid
flowchart TD
    subgraph RAIA_OP ["Raia 1: Operador de Campo (Funcionário ou Terceirizado)"]
        A1(["Início: Necessidade de conferir\npilha de Mesas ou Gradis"])
        A2["Abre o app SIGA Mobile e\nseleciona Câmera ou Galeria"]
        A3["Enquadra pilha (ângulo 30°–45°\npara gradis) e captura a foto"]
        A4{"Foto nítida\ne bem iluminada?"}
        A5["Descarta foto e\nrepete captura"]
        A6["Inspeciona pontos coloridos\ncom zoom de pinça (pinch-to-zoom)"]
        A7{"Contagem da IA\nestá correta?"}
        A8["Ajusta total manual (+ / −)\nou toca nos marcadores"]
        A9["Informa justificativa textual\nobrigatória (> 10%)"]
        A10["Clica em 'Salvar contagem'"]
    end

    subgraph RAIA_APP ["Raia 2: App SIGA Mobile (UI, Sensores e Regras)"]
        B1["Coleta inclinação (pitch/roll)\ne coordenadas GPS + endereço"]
        B2["Exibe pré-visualização da foto"]
        B3["Calcula divergência:\n|Confirmado − IA| / IA × 100"]
        B4{"Divergência >\n10,0%?"}
        B5["Bloqueia salvamento e exibe\nalerta vermelho de auditoria"]
        B6(["Fim Local: Exibe contagem no\nHistórico (status PENDENTE)"])
    end

    subgraph RAIA_IA ["Raia 3: Motor de IA Local (TFLite + Contrato v2.0)"]
        C1["Redimensiona para 640×640\ncom letterbox proporcional (float32)"]
        C2["Executa yolo.tflite offline\n(react-native-fast-tflite)"]
        C3["Decodifica tensores e aplica\nNMS por classe (Gradil IoU=0.60)"]
        C4["Agrupa por classe e converte\ntable_joint (ceil(juntas / 2))"]
    end

    subgraph RAIA_SQL ["Raia 4: Persistência Local (SQLite)"]
        D1["Gera UUID único da contagem\ne copia imagem para diretório privado"]
        D2["Executa INSERT na tabela\ncontagens (sincronizado = 0)"]
    end

    A1 --> A2 --> A3 --> B1 --> B2 --> A4
    A4 -- "Não" --> A5 --> A3
    A4 -- "Sim" --> C1 --> C2 --> C3 --> C4 --> A6
    A6 --> A7
    A7 -- "Sim" --> A10
    A7 -- "Não" --> A8 --> B3 --> B4
    B4 -- "Não (≤ 10%)" --> A10
    B4 -- "Sim (> 10%) sem texto" --> B5 --> A9 --> A10
    B4 -- "Sim (> 10%) com justificativa" --> A10
    A10 --> D1 --> D2 --> B6
```

---

## BPD 02 — Sincronização Assíncrona, Homologação de Hardware e Auditoria Formal

Descreve o processo de envio dos lotes armazenados no SQLite quando o dispositivo recupera conectividade, a validação de segurança do hardware (`X-Device-UUID`), a aplicação das regras operacionais versionadas por perfil e a auditoria visual imutável no **SIGA Web Admin**.

```mermaid
flowchart TD
    subgraph RAIA_MOB ["Raia 1: App SIGA Mobile (DjangoSyncDataSource)"]
        M1(["Início: Lotes com\nsincronizado = 0 no SQLite"])
        M2["Envia POST /api/sincronizar/\ncom Auth + X-Device-UUID + Payload UUID"]
        M3["Exibe aviso ao operador:\naparelho pendente/bloqueado"]
        M4["Exibe erro de validação (422)\npara correção/revisão"]
        M5["Marca registro local como\nsincronizado = 1"]
    end

    subgraph RAIA_API ["Raia 2: Gatekeeper & API REST (Django / DRF)"]
        S1["Identifica Empresa e verifica\nDispositivoMovel (X-Device-UUID)"]
        S2{"Dispositivo já\ncadastrado?"}
        S3{"Usuário já possui\noutro aparelho?"}
        S4["Registra 1º aparelho como\nAUTORIZADO"]
        S5["Registra 2º+ aparelho como\nPENDENTE de homologação"]
        S6{"Status do\ndispositivo?"}
        S7["Retorna HTTP 403 Forbidden"]
        S8["Carrega RegraOperacionalMobile\nvigente para o perfil"]
        S9{"Respeita limite do perfil\n(Func 20% / Terc 5%) e\njustificativa > 10%?"}
        S10["Retorna HTTP 422\nUnprocessable Entity"]
        S11["Abre @transaction.atomic e\nsalva Inventario + ItemInventario"]
        S12{"Algum item com\ndivergência > tolerância?"}
        S13["Define status = EM_ANALISE"]
        S14["Define status = DIVERGENTE"]
        S15["Retorna HTTP 201 Created"]
    end

    subgraph RAIA_GESTOR ["Raia 3: Gerente Operacional / Auditor (Web Admin)"]
        G1["Recebe alerta de novo dispositivo\nPENDENTE em /dispositivos/"]
        G2["Decide: AUTORIZAR ou BLOQUEAR\no dispositivo móvel"]
        G3["Acessa /inventarios/ e filtra\nlotes DIVERGENTE ou EM_ANALISE"]
        G4["Abre /inventarios/<id>/ e compara\nfoto, IA vs. Humano e justificativa"]
        G5["Registra parecer formal e\nclica em APROVAR ou REJEITAR"]
        G6(["Fim: Atualiza status do Inventario e\ngrava entrada imutável em LogAuditoria"])
    end

    M1 --> M2 --> S1 --> S2
    S2 -- "Não" --> S3
    S3 -- "Não (1º aparelho)" --> S4 --> S6
    S3 -- "Sim (2º+ aparelho)" --> S5 --> S6
    S2 -- "Sim" --> S6
    S6 -- "PENDENTE ou BLOQUEADO" --> S7 --> M3
    S6 -- "PENDENTE (fluxo Web)" --> G1 --> G2
    S6 -- "AUTORIZADO" --> S8 --> S9
    S9 -- "Não" --> S10 --> M4
    S9 -- "Sim" --> S11 --> S12
    S12 -- "Não" --> S13 --> S15 --> M5
    S12 -- "Sim" --> S14 --> S15 --> M5
    S13 --> G3
    S14 --> G3
    G3 --> G4 --> G5 --> G6
```

---

## BPD 03 — Manifestação de Interesse (Vitrine RFQ), WhatsApp Bot e Digest Executivo

Descreve o processo integrado dos **4 Pilares Corporativos do SIGA Web Admin v2.0**: autoatendimento inicial via Webhook WhatsApp, captação de solicitações na Vitrine Pública parametrizada, triagem logística pelo gestor e consolidação executiva para a diretoria com trilha imutável de eventos.

```mermaid
flowchart TD
    subgraph RAIA_CLI ["Raia 1: Cliente Externo"]
        C1(["Início: Interesse em locar\nestruturas para evento"])
        C2["Envia mensagem no WhatsApp\nda locadora"]
        C3["Acessa Vitrine Pública\n/portal/<subdominio>/"]
        C4["Preenche dados do evento, quantidades\ne envia Manifestação de Interesse"]
        C5["Recebe confirmação automática\ne aguarda retorno logístico"]
    end

    subgraph RAIA_BOT ["Raia 2: Webhook WhatsApp & Vitrine Pública"]
        W1["POST /api/webhooks/whatsapp/\nidentifica empresa e parâmetros"]
        W2{"Opção\nselecionada?"}
        W3["Opção 1: Envia região, antecedência\ne prazo de frete"]
        W4["Opção 2: Lista ativos\nhomologados do catálogo"]
        W5["Opção 3: Gera token_wpp e\nlink pré-identificado da vitrine"]
        W6["Valida limites min/max por ativo\ne data mínima de antecedência"]
        W7["Cria SolicitacaoInteresse (RECEBIDO)\ne dispara confirmação WhatsApp simulada"]
    end

    subgraph RAIA_GES ["Raia 3: Gestor / Diretoria (SIGA Web Admin)"]
        L1["Visualiza esteira em /solicitacoes/"]
        L2["Analisa viabilidade de rota, frota\ne estoque para as datas"]
        L3{"Solicitante é\nCliente VIP?"}
        L4["Atualiza status (EM_TRIAGEM,\nVIABILIDADE_APROVADA, PROPOSTA_ENVIADA\nou CANCELADO_POR_LOGISTICA)"]
        L5["Acessa /notificacoes/ e aciona\n'Gerar Digest Executivo'"]
        L6(["Fim: Diretoria recebe resumo consolidado\n(novas RFQs, divergências, contratos a vencer)"])
    end

    subgraph RAIA_LOG ["Raia 4: Motor de Notificações & Audit Trail"]
        E1["Grava WHATSAPP_TRIAGEM_RESPONDIDA\nem HistoricoEvento"]
        E2["Grava SOLICITACAO_CRIADA e\nWHATSAPP_CONFIRMACAO_ENVIADA"]
        E3["Cria NotificacaoInterna\n(ALERTA_CRITICO para Diretoria)"]
        E4["Grava STATUS_ESTEIRA_ALTERADO\nem HistoricoEvento"]
        E5["Grava NotificacaoInterna (DIGEST_EXECUTIVO)\ne EMAIL_DIGEST_ENVIADO"]
    end

    C1 --> C2 --> W1 --> W2
    W2 -- "1" --> W3 --> E1
    W2 -- "2" --> W4 --> E1
    W2 -- "3" --> W5 --> E1 --> C3
    C1 --> C3 --> C4 --> W6 --> W7 --> C5
    W7 --> E2 --> L1 --> L2 --> L3
    L3 -- "Sim" --> E3 --> L4
    L3 -- "Não" --> L4
    L4 --> E4 --> L5 --> E5 --> L6
```
