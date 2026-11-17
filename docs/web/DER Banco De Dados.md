erDiagram
    Empresa ||--o{ Usuario : "possui"
    Empresa ||--o{ ClasseAtivo : "cadastra"
    Empresa ||--o{ DispositivoMovel : "homologa"
    Empresa ||--o{ RegraOperacionalMobile : "parametriza"

    PerfilAcesso ||--o{ Usuario : "define nível de"
    Usuario ||--o| Funcionario : "especializa (1:1)"
    Usuario ||--o| Terceirizado : "especializa (1:1)"

    Usuario ||--o{ Inventario : "executa"
    DispositivoMovel ||--o{ Inventario : "transmite"
    RegraOperacionalMobile ||--o{ Inventario : "rege (Opção 2)"

    Inventario ||--o{ ItemInventario : "contém (Cascade)"
    ClasseAtivo ||--o{ ItemInventario : "classifica"
    Inventario ||--o{ LogAuditoria : "registra"
    Usuario ||--o{ LogAuditoria : "audita"

    Empresa {
        uuid id PK
        string razao_social
        string schema_name UK
        string subdominio UK
        boolean status_ativo
    }

    PerfilAcesso {
        int id PK
        string nome_perfil
        int nivel_permissao
    }

    Usuario {
        uuid id PK
        string nome
        string email UK
        string cpf UK
        string senha_hash
        boolean status
        int id_perfil FK
        uuid id_empresa FK
    }

    Funcionario {
        uuid id_usuario PK,FK
        string matricula UK
        string departamento
    }

    Terceirizado {
        uuid id_usuario PK,FK
        string empresa_prestadora
        date data_fim_contrato
    }

    RegraOperacionalMobile {
        int id PK
        string tipo_operador_alvo "FUNCIONARIO / TERCEIRIZADO"
        decimal limite_edicao_manual_pct
        decimal tolerancia_erro_ia_pct "10.0%"
        boolean exige_justificativa
        time horario_inicio
        time horario_fim
        int versao
        uuid id_empresa FK
    }

    DispositivoMovel {
        uuid id PK
        string uuid_dispositivo UK
        string modelo
        string status_autorizacao
        uuid id_empresa FK
    }

    ClasseAtivo {
        int id PK
        string nome_classe "Mesa Bistrô / Gradil"
        string categoria
        string imagem_referencia_url
        uuid id_empresa FK
    }

    Inventario {
        uuid id PK
        datetime data_hora_inicio
        datetime data_hora_fim
        string status_auditoria
        string lat_long
        uuid id_usuario FK
        uuid id_dispositivo FK
        int id_regra_operacional FK "Opção 2"
    }

    ItemInventario {
        uuid id PK
        uuid id_inventario FK
        int id_classe_ativo FK
        int qtd_detectada_ia "YOLO26n"
        int qtd_corrigida_usuario
        string foto_url
        string justificativa_correcao
    }

    LogAuditoria {
        uuid id PK
        uuid id_inventario FK
        uuid id_usuario_auditor FK
        datetime data_hora
        string status_anterior
        string status_novo
        string observacoes
    }