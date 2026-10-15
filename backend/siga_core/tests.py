import datetime
from django.test import TestCase, Client
from django.urls import reverse
from siga_core.models import (
    Empresa,
    Usuario,
    TipoOperador,
    Funcionario,
    Terceirizado,
    RegraOperacionalMobile,
    DispositivoMovel,
    ClasseAtivo,
    Inventario,
    ItemInventario,
)


class SigaCoreModelTests(TestCase):
    def setUp(self):
        self.empresa = Empresa.objects.create(
            razao_social="Logística Brasil Ltda",
            schema_name="tenant_logbrasil",
            subdominio="logbrasil",
        )

        self.user_func = Usuario.objects.create_user(
            username="joao.silva",
            email="joao@logbrasil.com.br",
            password="password123",
            first_name="João",
            last_name="Silva",
            empresa=self.empresa,
            tipo_operador=TipoOperador.FUNCIONARIO,
        )
        self.funcionario = Funcionario.objects.create(
            usuario=self.user_func,
            matricula="MAT-1001",
            departamento="Logística",
        )

        self.user_terc = Usuario.objects.create_user(
            username="pedro.terc",
            email="pedro@terceirizado.com",
            password="password123",
            first_name="Pedro",
            last_name="Santos",
            empresa=self.empresa,
            tipo_operador=TipoOperador.TERCEIRIZADO,
        )
        self.terceirizado = Terceirizado.objects.create(
            usuario=self.user_terc,
            empresa_prestadora="Prestadora Alfa",
            tipo_contrato=Terceirizado.TipoContrato.TEMPORARIO,
            dias_acesso_ano=90,
            data_fim_contrato=datetime.date(2026, 12, 31),
        )

        self.dispositivo = DispositivoMovel.objects.create(
            empresa=self.empresa,
            uuid_dispositivo="HW-TEST-001",
            modelo="Galaxy Tab Active 3",
            status_autorizacao=DispositivoMovel.StatusAutorizacao.AUTORIZADO,
        )

    def test_classe_ativo_auto_slug_e_descricao(self):
        ativo = ClasseAtivo.objects.create(
            empresa=self.empresa,
            nome_classe="Palete Madeira Padrão PBR",
            categoria="Paletes",
            descricao="Estrutura de madeira tratada para movimentação em empilhadeira.",
        )
        self.assertEqual(ativo.codigo_yolo, "palete_madeira_padrao_pbr")
        self.assertIn("Estrutura de madeira", ativo.descricao)

    def test_terceirizado_regras_contrato_e_dias(self):
        self.assertEqual(self.terceirizado.tipo_contrato, Terceirizado.TipoContrato.TEMPORARIO)
        self.assertEqual(self.terceirizado.dias_acesso_ano, 90)
        self.assertEqual(self.terceirizado.empresa_prestadora, "Prestadora Alfa")
        self.assertEqual(self.terceirizado.data_fim_contrato, datetime.date(2026, 12, 31))

    def test_inventario_divergencias_calculo(self):
        ativo = ClasseAtivo.objects.create(
            empresa=self.empresa,
            nome_classe="Cadeira de Escritório",
            categoria="Mobiliário",
        )
        from django.utils import timezone
        agora = timezone.now()
        inventario = Inventario.objects.create(
            empresa=self.empresa,
            dispositivo=self.dispositivo,
            usuario=self.user_func,
            status_auditoria=Inventario.StatusAuditoria.DIVERGENTE,
            data_hora_inicio=agora,
            data_hora_fim=agora,
        )
        item = ItemInventario.objects.create(
            inventario=inventario,
            classe_ativo=ativo,
            qtd_detectada_ia=10,
            qtd_confirmada_humano=12,
            justificativa="Ajuste de 2 cadeiras adicionais encontradas na sala de reunião.",
        )
        self.assertEqual(item.qtd_confirmada_humano, 12)
        self.assertEqual(item.qtd_detectada_ia, 10)
        self.assertEqual(inventario.status_auditoria, Inventario.StatusAuditoria.DIVERGENTE)


class SigaCoreViewTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.empresa = Empresa.objects.create(
            razao_social="Logística Brasil Ltda",
            schema_name="tenant_logbrasil_views",
            subdominio="logbrasilviews",
        )
        self.user = Usuario.objects.create_user(
            username="admin.log",
            email="admin@logbrasil.com.br",
            password="password123",
            first_name="Admin",
            last_name="Log",
            empresa=self.empresa,
            tipo_operador=TipoOperador.GESTOR,
        )
        self.client.force_login(self.user)

    def test_dashboard_view(self):
        response = self.client.get(reverse("dashboard"))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "core/dashboard.html")

    def test_inventario_list_view(self):
        response = self.client.get(reverse("inventario_list"))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "inventarios/inventario_list.html")

    def test_ativo_list_view(self):
        response = self.client.get(reverse("ativo_list"))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "ativos/ativo_list.html")

    def test_usuario_list_view(self):
        response = self.client.get(reverse("usuario_list"))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "usuarios/usuario_list.html")

    def test_regras_form_view(self):
        response = self.client.get(reverse("regras_config"))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "regras/regras_form.html")
