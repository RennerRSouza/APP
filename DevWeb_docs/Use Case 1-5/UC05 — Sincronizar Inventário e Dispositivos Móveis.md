sequenceDiagram
    autonumber
    participant AppMobile as App Mobile<br/>(React Native/TS)
    participant Middleware as Tenant & DeviceAuth<br/>Middleware
    participant SincAPI as SincronizacaoAPIView<br/>(Django REST)
    participant Serializer as InventarioSyncSerializer<br/>(Validador)
    participant Storage as Object Storage<br/>(MinIO/S3)
    participant Database as PostgreSQL<br/>(Schema Tenant)
    
    AppMobile->>AppMobile: Detecta conexão de rede<br/>restaurada
    AppMobile->>AppMobile: Prepara lote de inventário<br/>+ fotos (offline)
    AppMobile->>Middleware: POST /api/sincronizar-inventario<br/>com X-Device-UUID
    
    alt Validação de Hardware
        Middleware->>Database: SELECT status FROM dispositivo<br/>WHERE uuid = X-Device-UUID
        Database-->>Middleware: status != 'AUTORIZADO'
        Middleware-->>AppMobile: HTTP 403 Forbidden<br/>(Dispositivo não homologado)
        AppMobile->>AppMobile: Mantém registros como<br/>PENDENTE no SQLite
    else Dispositivo Autorizado
        Middleware->>SincAPI: Passa para View
        SincAPI->>Serializer: Valida payload de inventário
        
        alt Validação de Regras do Operador
            Serializer->>Database: SELECT perfil, RegraOperacionalMobile<br/>FROM operador WHERE id = ?
            Database-->>Serializer: Dados carregados
            Serializer->>Serializer: Verifica edições manuais vs<br/>tolerância YOLO (10%)
            Serializer-->>SincAPI: HTTP 422 Unprocessable Entity<br/>(Divergência sem justificativa)
            SincAPI-->>AppMobile: Erro de validação<br/>(Edição manual rejeitada)
            AppMobile->>AppMobile: Notifica operador para<br/>ajustar dados
        else Regras Validadas com Sucesso
            SincAPI->>Storage: Upload em streaming<br/>das fotos de campo
            Storage-->>SincAPI: Confirmação de upload
            Storage->>Storage: Arquivos armazenados com<br/>versionamento
            
            SincAPI->>Database: BEGIN TRANSACTION (@atomic)
            Database-->>SincAPI: Transação iniciada
            
            SincAPI->>Database: INSERT INTO inventario<br/>(operador_id, versao_regra,<br/>data_sincronismo, ...)
            Database-->>SincAPI: inventory_id gerado
            
            SincAPI->>Database: INSERT INTO itemInventario<br/>(inventory_id, produto,<br/>qtd_yolo, qtd_corrigida, ...)<br/>para cada item do lote
            Database-->>SincAPI: Items inseridos
            
            SincAPI->>Database: COMMIT TRANSACTION
            Database-->>SincAPI: Transação confirmada
            
            SincAPI-->>AppMobile: HTTP 201 Created<br/>com lista de UUIDs confirmados
            
            AppMobile->>AppMobile: Atualiza registros locais<br/>SQLite: PENDENTE → SINCRONIZADO
            AppMobile->>AppMobile: Notifica sucesso ao operador
        end
    end