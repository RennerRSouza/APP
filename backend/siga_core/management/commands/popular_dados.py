from decimal import Decimal
from datetime import date
from django.core.management.base import BaseCommand
from siga_core.models import (
    Empresa, Usuario, Funcionario, Terceirizado,
    ClasseAtivo, RegraOperacionalMobile, TipoOperador
)


class Command(BaseCommand):
    help = "Popula o banco de dados com dados de teste (Empresa, Ativos, Regras e Usuários)."

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Iniciando carga inicial de dados do SIGA..."))

        # 1. Empresa Principal
        empresa, _ = Empresa.objects.get_or_create(
            schema_name="locadora_prime",
            defaults={
                "razao_social": "Locadora Prime Eventos Ltda",
                "subdominio": "prime",
                "status_ativo": True,
            }
        )
        self.stdout.write(self.style.SUCCESS(f"[OK] Empresa garantida: {empresa.razao_social}"))

        # Vincula o superusuário à empresa (se ainda não estiver)
        superusers = Usuario.objects.filter(is_superuser=True, empresa__isnull=True)
        for su in superusers:
            su.empresa = empresa
            su.tipo_operador = TipoOperador.GESTOR
            su.save()
            self.stdout.write(self.style.SUCCESS(f"[OK] Superusuário '{su.username}' vinculado à {empresa.razao_social}"))

        # 2. Catálogo de Ativos (Mesa Bistrô e Gradil)
        ativos_iniciais = [
            {"nome": "Mesa Bistrô", "codigo": "mesa_bistro", "categoria": "Mobiliário"},
            {"nome": "Gradil", "codigo": "gradil", "categoria": "Estruturas e Segurança"},
        ]
        for item in ativos_iniciais:
            obj, created = ClasseAtivo.objects.get_or_create(
                empresa=empresa,
                nome_classe=item["nome"],
                defaults={
                    "codigo_yolo": item["codigo"],
                    "categoria": item["categoria"]
                }
            )
            status_txt = "criado" if created else "já existia"
            self.stdout.write(self.style.SUCCESS(f"[OK] Ativo '{obj.nome_classe}' ({status_txt})"))

        # 3. Regras Operacionais (Funcionário vs. Terceirizado)
        # Regra Funcionário: mais flexível (20% edição)
        regra_func, _ = RegraOperacionalMobile.objects.get_or_create(
            empresa=empresa,
            tipo_operador_alvo=TipoOperador.FUNCIONARIO,
            defaults={
                "limite_edicao_manual_pct": Decimal("20.0"),
                "tolerancia_erro_ia_pct": Decimal("10.0"),
                "exige_justificativa": True,
                "versao": 1,
            }
        )

        # Regra Terceirizado: mais rígida (5% edição máxima)
        regra_terc, _ = RegraOperacionalMobile.objects.get_or_create(
            empresa=empresa,
            tipo_operador_alvo=TipoOperador.TERCEIRIZADO,
            defaults={
                "limite_edicao_manual_pct": Decimal("5.0"),
                "tolerancia_erro_ia_pct": Decimal("10.0"),
                "exige_justificativa": True,
                "versao": 1,
            }
        )
        self.stdout.write(self.style.SUCCESS("[OK] Regras operacionais para Funcionário e Terceirizado configuradas"))

        # 4. Usuários de Teste
        # A) Funcionário
        user_func, created = Usuario.objects.get_or_create(
            username="funcionario1",
            defaults={
                "email": "funcionario1@prime.com",
                "first_name": "Carlos",
                "last_name": "Silva",
                "empresa": empresa,
                "tipo_operador": TipoOperador.FUNCIONARIO,
                "status_ativo": True,
            }
        )
        if created:
            user_func.set_password("senha123")
            user_func.save()
            Funcionario.objects.create(
                usuario=user_func,
                matricula="MAT-1042",
                departamento="Operações e Logística"
            )
            self.stdout.write(self.style.SUCCESS("[OK] Usuário 'funcionario1' (senha123) criado com perfil Funcionario"))

        # B) Terceirizado
        user_terc, created = Usuario.objects.get_or_create(
            username="terceirizado1",
            defaults={
                "email": "terceirizado1@prime.com",
                "first_name": "João",
                "last_name": "Montador",
                "empresa": empresa,
                "tipo_operador": TipoOperador.TERCEIRIZADO,
                "status_ativo": True,
            }
        )
        if created:
            user_terc.set_password("senha123")
            user_terc.save()
            Terceirizado.objects.create(
                usuario=user_terc,
                empresa_prestadora="Staff Montagens Terceirizadas Eireli",
                tipo_contrato=Terceirizado.TipoContrato.TEMPORARIO,
                dias_acesso_ano=180,
                data_fim_contrato=date(2027, 12, 31)
            )
            self.stdout.write(self.style.SUCCESS("[OK] Usuário 'terceirizado1' (senha123) criado com perfil Terceirizado"))

        # 5. Dispositivo Móvel e Inventários de Demonstração
        from django.utils import timezone
        from siga_core.models import DispositivoMovel, Inventario, ItemInventario

        disp, _ = DispositivoMovel.objects.get_or_create(
            empresa=empresa,
            uuid_dispositivo="SAMSUNG-TAB-001",
            defaults={
                "modelo": "Samsung Galaxy Tab Active 3",
                "status_autorizacao": DispositivoMovel.StatusAutorizacao.AUTORIZADO,
            }
        )

        ativo_mesa = ClasseAtivo.objects.filter(empresa=empresa, nome_classe="Mesa Bistrô").first()
        ativo_gradil = ClasseAtivo.objects.filter(empresa=empresa, nome_classe="Gradil").first()

        # Inventário 1: 0 divergências (Aprovado - Badge Verde)
        inv_ok, inv_ok_created = Inventario.objects.get_or_create(
            empresa=empresa,
            usuario=user_func,
            status_auditoria=Inventario.StatusAuditoria.APROVADO,
            defaults={
                "dispositivo": disp,
                "data_hora_inicio": timezone.now(),
                "data_hora_fim": timezone.now(),
                "lat_long": "-23.5505,-46.6333",
            }
        )
        if inv_ok_created and ativo_mesa:
            ItemInventario.objects.create(
                inventario=inv_ok,
                classe_ativo=ativo_mesa,
                qtd_detectada_ia=15,
                qtd_confirmada_humano=15,
            )
            self.stdout.write(self.style.SUCCESS("[OK] Inventário sem divergência criado (Badge Verde)"))

        # Inventário 2: com divergência (Requer Auditoria - Badge Vermelho)
        inv_div, inv_div_created = Inventario.objects.get_or_create(
            empresa=empresa,
            usuario=user_terc,
            status_auditoria=Inventario.StatusAuditoria.DIVERGENTE,
            defaults={
                "dispositivo": disp,
                "data_hora_inicio": timezone.now(),
                "data_hora_fim": timezone.now(),
                "lat_long": "-23.5510,-46.6340",
            }
        )
        if inv_div_created and ativo_gradil:
            ItemInventario.objects.create(
                inventario=inv_div,
                classe_ativo=ativo_gradil,
                qtd_detectada_ia=8,
                qtd_confirmada_humano=10,
                justificativa="Duas peças estavam no depósito dos fundos fora do alcance inicial da câmera.",
            )
            self.stdout.write(self.style.SUCCESS("[OK] Inventário com divergência criado (Badge Vermelho)"))

        self.stdout.write(self.style.SUCCESS("\n==> Carga concluída com sucesso! Banco pronto para uso."))