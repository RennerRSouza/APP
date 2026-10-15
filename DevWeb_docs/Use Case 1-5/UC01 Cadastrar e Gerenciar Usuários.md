
sequenceDiagram
    autonumber
    actor AdminEmpresa as Administradorbr(Empresa)
    participant Frontend as Frontend Webbr(Browser)
    participant Middleware as TenantMiddlewarebr(Django)
    participant ViewSet as UsuarioViewSetbr(DRF)
    participant Serializer as UsuarioSerializer
    participant Models as ModelsbrUsuario,brFuncionario,brTerceirizado
    participant PostgreSQL as PostgreSQLbr(Schema Tenant)
    participant AsyncQueue as CelerybrRedis

    AdminEmpresa-Frontend Acessa adminbrClica criar usuário
    Frontend-Middleware POST apiusuarios
    Middleware-Middleware Identifica Tenantbrpela requisição
    Middleware-ViewSet create(request)brcom contexto tenant
    ViewSet-Serializer is_valid()
    Serializer-Serializer Valida dadosbrCPF, E-mail, etc

    alt CPF ou E-mail já cadastrado
        Serializer-PostgreSQL SELECT  WHEREbrcpf=X OR email=Y
        PostgreSQL--Serializer Registros encontrados
        Serializer--ViewSet Erro Duplicado
        ViewSet--Frontend HTTP 400brBad Request
        Frontend--AdminEmpresa Exibe mensagembrCPFE-mail em uso
    else Dados válidos
        Serializer-Serializer Hash senhabr(Bcrypt)
        ViewSet-Models usuario_obj =brUsuario.objects.create(
        Models-PostgreSQL INSERT Usuariobr(senha hasheada)
        PostgreSQL--Models usuario_id retornado
        Models--ViewSet usuario criado
        ViewSet-Models Identifica tipobris_funcionario
        alt É Funcionário
            ViewSet-Models Funcionario.objects.createbr(usuario_id, matrícula)
            Models-PostgreSQL INSERT Funcionario
            PostgreSQL--Models sucesso
        else É Terceirizado
            ViewSet-Models Terceirizado.objects.createbr(usuario_id,brempresa,brdata_vigencia_inicio,brdata_vigencia_fim)
            Models-PostgreSQL INSERT Terceirizado
            PostgreSQL--Models sucesso
        end
        ViewSet-AsyncQueue Enfileira taskbrsend_activation_emailbr(usuario_id, email)
        AsyncQueue--ViewSet Task enfileirada
        ViewSet--Frontend HTTP 201 Createdbr+ usuário dados
        Frontend--AdminEmpresa Exibe sucessobrUsuário criado
    end