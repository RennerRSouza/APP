
sequenceDiagram
    autonumber
    actor GerenciadorOp as Gerente Operacional
    participant FrontendWeb as Frontend Web
    participant TenantMiddleware as TenantMiddleware
    participant ClasseAtivoViewSet as ClasseAtivoViewSet
    participant ObjectStorage as Object Storage
    participant PostgreSQL as PostgreSQL

    GerenciadorOp->>FrontendWeb: Acessa formulário de catálogo
    FrontendWeb->>FrontendWeb: Exibe form de cadastro de classe de ativo
    GerenciadorOp->>FrontendWeb: Preenche dados (nome, especificações, dimensões, imagem)
    GerenciadorOp->>FrontendWeb: Clica em "Salvar"
    FrontendWeb->>FrontendWeb: Valida dados no cliente
    alt Arquivo inválido (extensão ou tamanho > 5MB)
        FrontendWeb->>FrontendWeb: Detecta arquivo inválido
        FrontendWeb->>GerenciadorOp: Exibe mensagem de erro
        note over GerenciadorOp: Operação interrompida
    else Dados válidos
        FrontendWeb->>TenantMiddleware: POST /api/classes-ativo/ + FormData (imagem + dados)
        TenantMiddleware->>TenantMiddleware: Resolve Empresa (tenant)
        TenantMiddleware->>ClasseAtivoViewSet: Encaminha requisição com tenant
        ClasseAtivoViewSet->>ClasseAtivoViewSet: Valida extensão e tamanho da imagem
        ClasseAtivoViewSet->>ObjectStorage: Faz upload (streaming) da imagem
        ObjectStorage->>ObjectStorage: Armazena arquivo
        ObjectStorage->>ClasseAtivoViewSet: Retorna URL pública segura
        ClasseAtivoViewSet->>PostgreSQL: INSERT ClasseAtivo (schema tenant)
        PostgreSQL->>PostgreSQL: Persiste entidade com URL da imagem
        PostgreSQL->>ClasseAtivoViewSet: Retorna entidade criada
        ClasseAtivoViewSet->>TenantMiddleware: HTTP 201 Created + JSON
        TenantMiddleware->>FrontendWeb: HTTP 201 Created + dados
        FrontendWeb->>FrontendWeb: Atualiza listagem de classes
        FrontendWeb->>GerenciadorOp: Exibe mensagem de sucesso
    end