from django.shortcuts import render
import uuid
from django.db import transaction
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from .models import (
    Inventario, ItemInventario, DispositivoMovel
)
from .serializers import InventarioSyncSerializer


class SincronizacaoAPIView(APIView):
    """
    Endpoint de sincronização offline-first do App Mobile React Native.
    Recebe lote de inventário gerado localmente com contagens YOLO.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        empresa = getattr(request.user, 'empresa', None)
        if not empresa:
            return Response(
                {"error": "Usuário não vinculado a uma Empresa."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 1. Validação do Dispositivo via Header
        device_uuid = request.headers.get('X-Device-UUID')
        dispositivo = None
        if device_uuid:
            dispositivo, _ = DispositivoMovel.objects.get_or_create(
                empresa=empresa,
                uuid_dispositivo=device_uuid,
                defaults={'modelo': request.headers.get('X-Device-Model', 'Desconhecido')}
            )
            if dispositivo.status_autorizacao == DispositivoMovel.StatusAutorizacao.BLOQUEADO:
                return Response(
                    {"error": "Dispositivo bloqueado pela administração."},
                    status=status.HTTP_403_FORBIDDEN
                )

        # 2. Validação dos dados e regras operacionais (10% IA + Justificativa)
        serializer = InventarioSyncSerializer(data=request.data, context={'request': request})
        if not serializer.is_valid():
            return Response(
                {"error": "Violação de regra operacional", "detalhes": serializer.errors},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY
            )

        validated_data = serializer.validated_data
        regra = validated_data['_regra_aplicada']
        itens_data = validated_data['itens']

        # 3. Transação atômica e idempotente
        with transaction.atomic():
            inventario_id = validated_data['id']

            inventario, created = Inventario.objects.update_or_create(
                id=inventario_id,
                defaults={
                    'empresa': empresa,
                    'usuario': request.user,
                    'dispositivo': dispositivo,
                    'regra_operacional': regra,
                    'data_hora_inicio': validated_data['data_hora_inicio'],
                    'data_hora_fim': validated_data['data_hora_fim'],
                    'lat_long': validated_data.get('lat_long', ''),
                    'status_auditoria': Inventario.StatusAuditoria.EM_ANALISE
                }
            )

            # Persiste os itens
            houve_divergencia = False
            for item in itens_data:
                classe_ativo = item['classe_ativo_instancia']
                item_id = item.get('id') or uuid.uuid4()

                item_obj, _ = ItemInventario.objects.update_or_create(
                    id=item_id,
                    inventario=inventario,
                    defaults={
                        'classe_ativo': classe_ativo,
                        'qtd_detectada_ia': item.get('qtd_detectada_ia', 0),
                        'qtd_confirmada_humano': item.get('qtd_confirmada_humano', 0),
                        'justificativa': item.get('justificativa', ''),
                        'detections_json': item.get('detections_json', []),
                        'foto': item.get('foto')
                    }
                )

                tolerancia = regra.tolerancia_erro_ia_pct if regra else 10.0
                if item_obj.divergencia_percentual > tolerancia:
                    houve_divergencia = True

            # Se algum item ultrapassou a tolerância da IA, marca o lote como DIVERGENTE
            if houve_divergencia:
                inventario.status_auditoria = Inventario.StatusAuditoria.DIVERGENTE
                inventario.save(update_fields=['status_auditoria'])

        # 4. Retorno HTTP 201 Created
        return Response(
            {
                "id": str(inventario.id),
                "status": inventario.status_auditoria,
                "timestamp": timezone.now().isoformat(),
                "message": "Inventário sincronizado com sucesso."
            },
            status=status.HTTP_201_CREATED
        )


class CatalogoAtivosAPIView(APIView):
    """
    Endpoint para o Mobile baixar as classes de ativos homologadas pela empresa
    (ex: Mesa Bistrô, Gradil) para orientar o modelo YOLO local.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        empresa = getattr(request.user, 'empresa', None)
        if not empresa:
            return Response([], status=status.HTTP_200_OK)

        ativos = empresa.classes_ativos.all().values('id', 'nome_classe', 'codigo_yolo', 'categoria')
        return Response(list(ativos), status=status.HTTP_200_OK)