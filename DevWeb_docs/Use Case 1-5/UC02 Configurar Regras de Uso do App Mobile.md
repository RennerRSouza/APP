
sequenceDiagram
    autonumber
    actor Admin as Administrador
    participant Web as Interface Web
    participant RulesView as RegraOperacionalView
    participant RulesForm as RegraOperacionalForm
    participant RulesModel as Model RegraOperacional
    participant DB as Banco PostgreSQL

    Admin->>Web: Acessa tela de parâmetros
    Web->>RulesView: Carrega lista de regras
    RulesView->>RulesModel: GET regras operacionais
    RulesModel->>DB: SELECT regras WHERE tenant_id
    DB-->>RulesModel: Retorna regras existentes
    RulesModel-->>RulesView: Regras operacionais
    RulesView-->>Web: Exibe regras (Funcionário, Terceirizado)

    Admin->>Web: Define Regra Funcionário
    Web->>RulesForm: Abre formulário para edição
    Admin->>RulesForm: Configura: IA=10%, Edição=20%, Just=Flexível
    RulesForm->>RulesForm: Valida dados de entrada

    alt Validação Falha
        RulesForm-->>Web: Erro HTTP 422 - Limite fora de 0-100%
        Web-->>Admin: Exibe mensagem de erro
    else Validação Sucesso
        RulesForm->>RulesModel: POST nova regra Funcionário
        RulesModel->>RulesModel: Incrementa versão (v1 -> v2)
        RulesModel->>DB: INSERT INTO regras_operacionais (tenant_schema)
        DB-->>RulesModel: Regra salva com sucesso
        RulesModel-->>RulesForm: HTTP 201 - Regra criada
        RulesForm-->>Web: Atualiza interface
        Web-->>Admin: Exibe confirmação Funcionário v2
    end

    Admin->>Web: Define Regra Terceirizado
    Web->>RulesForm: Abre formulário para edição
    Admin->>RulesForm: Configura: IA=10%, Edição=5%, Just=100% Obrigatória
    RulesForm->>RulesForm: Valida dados de entrada

    alt Validação Falha
        RulesForm-->>Web: Erro HTTP 422 - Limite fora de 0-100%
        Web-->>Admin: Exibe mensagem de erro
    else Validação Sucesso
        RulesForm->>RulesModel: POST nova regra Terceirizado
        RulesModel->>RulesModel: Incrementa versão (v1 -> v2)
        RulesModel->>DB: INSERT INTO regras_operacionais (tenant_schema)
        DB-->>RulesModel: Regra salva com sucesso
        RulesModel-->>RulesForm: HTTP 201 - Regra criada
        RulesForm-->>Web: Atualiza interface
        Web-->>Admin: Exibe confirmação Terceirizado v2
    end

    RulesModel->>DB: Regras v2 associadas para inventários futuros
    DB-->>RulesModel: Confirmação - Opção 2 ativada
    RulesModel-->>Web: Status: Regras em vigência
    Web-->>Admin: Dashboard atualizado com novas regras