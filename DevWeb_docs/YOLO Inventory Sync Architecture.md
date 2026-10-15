---
config:
  theme: dark
---
sequenceDiagram
    autonumber
    participant AppRN as App React Native
    participant Middleware as Tenant & DeviceAuth Middleware
    participant APIView as SincronizacaoAPIView
    participant Serializer as InventarioSyncSerializer
    participant Storage as Object Storage (MinIO/S3)
    participant DB as PostgreSQL (Schema Tenant)

    AppRN->>Middleware: POST /api/sincronizar/<br/>X-Device-UUID Header<br/>Lote offline (Mesa Bistrô,<br/>Gradil, YOLO detectados))
    alt Dispositivo Autorizado
        Middleware->>Middleware: Valida X-Device-UUID
        Middleware->>APIView: Passa requisição
        
        alt Perfil Válido & Regras Atendidas
            APIView->>Serializer: Inicia validação
            Serializer->>Serializer: Identifica perfil<br/>(Funcionário vs. Terceirizado)
            Serializer->>Serializer: Verifica edições manuais<br/>vs. tolerância 10%
            
            alt Justificativa Presente (se necessária)
                Serializer->>APIView: Validação OK
                APIView->>Storage: Upload de fotos
                Storage->>Storage: Armazena fotos
                
                APIView->>DB: @transaction.atomic BEGIN
                DB->>DB: INSERT INTO Inventario
                DB->>DB: INSERT INTO ItemInventario
                DB->>DB: Vincula RegraOperacional<br/>(Opção 2)
                DB->>DB: @transaction.atomic COMMIT
                
                DB->>APIView: Retorna ID Inventario
                APIView->>AppRN: HTTP 201 Created<br/>JSON: {id, status, timestamp}
            else Justificativa Ausente
                Serializer->>AppRN: HTTP 422 Unprocessable Entity<br/>JSON: {error: "Justificativa obrigatória"}
            end
        else Regras Violadas
            Serializer->>AppRN: HTTP 422 Unprocessable Entity<br/>JSON: {error: "Violação de regra operacional"}
        end
    else Dispositivo Bloqueado
        Middleware->>AppRN: HTTP 403 Forbidden<br/>JSON: {error: "Device não autorizado"}
    end