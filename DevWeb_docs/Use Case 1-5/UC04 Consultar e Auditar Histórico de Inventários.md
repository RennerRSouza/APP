
sequenceDiagram
    autonumber
    actor Auditor
    participant FrontendWeb as Frontend Web<br/>(Tela de Auditoria)
    participant TenantMiddleware
    participant InventarioAuditoriaView as InventarioAuditoriaView<br/>(Django)
    participant PostgreSQL as PostgreSQL<br/>(Schema Tenant)
    participant LogAuditoria as Model LogAuditoria<br/>(Append-Only)

    Auditor->>FrontendWeb: Aplica filtros (data, responsável, divergência > 10%)
    Auditor->>FrontendWeb: Requisita lista de inventários
    FrontendWeb->>TenantMiddleware: GET /api/inventarios/auditoria?filters=...
    TenantMiddleware->>TenantMiddleware: Resolve tenant_id da empresa
    TenantMiddleware->>InventarioAuditoriaView: Forward requisição com tenant_id
    InventarioAuditoriaView->>PostgreSQL: SELECT ItemInventario JOIN Usuario WHERE divergência > 10%
    PostgreSQL-->>InventarioAuditoriaView: Retorna lista com foto, contagem IA, ajuste manual, justificativa
    InventarioAuditoriaView-->>FrontendWeb: HTTP 200 + JSON (inventários filtrados)
    FrontendWeb->>FrontendWeb: Renderiza página detalhada com fotos e marcações YOLO26n
    FrontendWeb-->>Auditor: Exibe lista de conferências em campo

    Auditor->>FrontendWeb: Clica em "Marcar como Auditado/Aprovado"
    FrontendWeb->>FrontendWeb: Abre modal com campo de observações
    Auditor->>FrontendWeb: Insere parecer formal e observações
    FrontendWeb->>InventarioAuditoriaView: POST /api/inventarios/{id}/auditoria<br/>{ parecer, observações, timestamp }
    InventarioAuditoriaView->>InventarioAuditoriaView: Valida dados e autenticação
    InventarioAuditoriaView->>PostgreSQL: BEGIN TRANSACTION
    InventarioAuditoriaView->>LogAuditoria: INSERT (auditado_por, parecer, hash_prova, timestamp)
    LogAuditoria-->>PostgreSQL: Registra no append-only (sem update/delete)
    InventarioAuditoriaView->>PostgreSQL: UPDATE ItemInventario SET status='Auditado/Aprovado'
    PostgreSQL-->>InventarioAuditoriaView: COMMIT
    InventarioAuditoriaView-->>FrontendWeb: HTTP 200 OK { status: 'Auditado/Aprovado' }
    FrontendWeb->>FrontendWeb: Atualiza UI, desabilita edição
    FrontendWeb-->>Auditor: Exibe confirmação: "Auditoria registrada com sucesso"
    Auditor->>Auditor: Não-repúdio: Log imutável registrado no banco