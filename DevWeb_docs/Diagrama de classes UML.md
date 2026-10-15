classDiagram
    direction TB

    %% MIDDLEWARE
    class TenantMiddleware {
        +process_request(request): HttpResponse
        -ativar_schema(subdominio: string): void
    }

    %% VIEWS (CONTROLADORES)
    class SincronizacaoAPIView {
        <<DRF APIView>>
        +post(request): Response
        -obter_regra_operador(user): RegraOperacional
    }

    class AuditoriaInventarioView {
        <<TemplateView>>
        +get(request, id): HttpResponse
        +post_parecer(request, id): HttpResponse
    }

    %% FORMS & SERIALIZERS (VALIDADORES)
    class InventarioSyncSerializer {
        <<Serializer>>
        +validate(data): dict
        +validar_limites_perfil(operador, delta): bool
    }

    class RegraOperacionalForm {
        <<Form>>
        +clean(): dict
        +save_regra(): RegraOperacional
    }

    %% MODELS (LÓGICA DE NEGÓCIO)
    class Usuario {
        <<Model>>
        +tipo: Enum
        +autenticar(): bool
    }

    class Funcionario {
        <<Subclasse>>
        +matricula: string
        +pode_ver_historico(): bool = true
    }

    class Terceirizado {
        <<Subclasse>>
        +contrato_vigente(): bool
        +pode_ver_historico(): bool = false
    }

    class RegraOperacional {
        <<Model>>
        +tipo_operador_alvo: Enum
        +tolerancia_ia: decimal = 10.0
        +limite_edicao_pct: decimal
        +validar_delta(delta: int): bool
    }

    class Inventario {
        <<Model>>
        +calcular_divergencia(): decimal
        +excede_regra(regra): bool
        +marcar_auditado(parecer): void
    }

    class LogAuditoria {
        <<Model - Append Only>>
        +save(): void
    }

    %% APRESENTAÇÃO
    class TemplateAuditoriaHTML {
        <<Template DTL>>
        +auditoria_detalhe.html
    }

    class MobileJSONResponse {
        <<HTTP Response>>
        +Status 201 Created
        +Status 422 Unprocessable
    }

    %% RELACIONAMENTOS MVT
    TenantMiddleware ..> SincronizacaoAPIView : injeta tenant
    TenantMiddleware ..> AuditoriaInventarioView : injeta tenant

    Usuario <|-- Funcionario
    Usuario <|-- Terceirizado

    SincronizacaoAPIView --> InventarioSyncSerializer : valida payload
    InventarioSyncSerializer ..> RegraOperacional : checa limites do perfil
    InventarioSyncSerializer --> Inventario : instancia
    SincronizacaoAPIView --> MobileJSONResponse : responde ao React Native

    AuditoriaInventarioView --> Inventario : consulta / atualiza
    AuditoriaInventarioView --> LogAuditoria : grava parecer
    AuditoriaInventarioView --> TemplateAuditoriaHTML : renderiza