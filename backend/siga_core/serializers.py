from decimal import Decimal
from rest_framework import serializers
from .models import (
    Inventario, ItemInventario, ClasseAtivo,
    RegraOperacionalMobile, TipoOperador
)


class ItemInventarioSyncSerializer(serializers.ModelSerializer):
    # Aceita o código YOLO (ex: 'mesa_bistro' ou 'gradil') ou o ID da classe
    classe_codigo = serializers.CharField(write_only=True)
    id = serializers.UUIDField(required=False)

    class Meta:
        model = ItemInventario
        fields = [
            'id', 'classe_codigo', 'qtd_detectada_ia',
            'qtd_confirmada_humano', 'justificativa',
            'detections_json', 'foto'
        ]


class InventarioSyncSerializer(serializers.ModelSerializer):
    itens = ItemInventarioSyncSerializer(many=True)
    id = serializers.UUIDField()  # Gerado no celular para idempotência

    class Meta:
        model = Inventario
        fields = [
            'id', 'data_hora_inicio', 'data_hora_fim',
            'lat_long', 'itens'
        ]

    def validate(self, attrs):
        request = self.context.get('request')
        usuario = request.user if request else None

        if not usuario or not usuario.is_authenticated:
            raise serializers.ValidationError("Usuário não autenticado.")

        empresa = usuario.empresa
        if not empresa:
            raise serializers.ValidationError("Usuário não está vinculado a nenhuma Empresa.")

        # Busca a regra operacional para o perfil do operador (Funcionário vs. Terceirizado)
        tipo_alvo = usuario.tipo_operador if usuario.tipo_operador in [TipoOperador.FUNCIONARIO, TipoOperador.TERCEIRIZADO] else TipoOperador.FUNCIONARIO
        regra = RegraOperacionalMobile.objects.filter(
            empresa=empresa,
            tipo_operador_alvo=tipo_alvo
        ).first()

        tolerancia_ia = regra.tolerancia_erro_ia_pct if regra else Decimal('10.0')
        limite_edicao = regra.limite_edicao_manual_pct if regra else Decimal('20.0')
        exige_justificativa = regra.exige_justificativa if regra else True

        # Valida item a item do lote
        itens_data = attrs.get('itens', [])
        if not itens_data:
            raise serializers.ValidationError("O lote de inventário deve conter ao menos um item.")

        for item in itens_data:
            codigo = item.get('classe_codigo')
            # Valida se a classe pertence ao catálogo da Empresa
            classe_ativo = ClasseAtivo.objects.filter(
                empresa=empresa,
                codigo_yolo__iexact=codigo
            ).first() or ClasseAtivo.objects.filter(
                empresa=empresa,
                nome_classe__iexact=codigo
            ).first()

            if not classe_ativo:
                raise serializers.ValidationError(
                    f"Classe de ativo '{codigo}' não encontrada no catálogo da empresa {empresa.razao_social}."
                )

            item['classe_ativo_instancia'] = classe_ativo

            # Cálculo de divergência da IA vs. Operador Humano
            ia = item.get('qtd_detectada_ia', 0)
            humano = item.get('qtd_confirmada_humano', 0)
            delta = abs(humano - ia)
            divergencia_pct = (Decimal(delta) / Decimal(ia) * Decimal('100.0')) if ia > 0 else (Decimal('0.0') if humano == 0 else Decimal('100.0'))

            justificativa = (item.get('justificativa') or '').strip()

            # 1. Checagem de obrigatoriedade de justificativa caso supere a tolerância de 10%
            if divergencia_pct > tolerancia_ia and exige_justificativa and not justificativa:
                raise serializers.ValidationError({
                    "justificativa": (
                        f"Justificativa obrigatória para '{classe_ativo.nome_classe}'. "
                        f"A divergência foi de {divergencia_pct:.1f}% (tolerância máxima da IA: {tolerancia_ia}%)."
                    )
                })

            # 2. Checagem de limite operacional do perfil (bloqueio por extrapolar margem)
            if divergencia_pct > limite_edicao:
                raise serializers.ValidationError({
                    "limite_operacional": (
                        f"A alteração manual de {divergencia_pct:.1f}% em '{classe_ativo.nome_classe}' "
                        f"excede o limite de {limite_edicao}% configurado para operadores do tipo {usuario.get_tipo_operador_display()}."
                    )
                })

        attrs['_regra_aplicada'] = regra
        attrs['_empresa'] = empresa
        return attrs