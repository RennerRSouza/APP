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
    ParametrosLocacao,
    SolicitacaoInteresse,
    NotificacaoInterna,
    HistoricoEvento,
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

    def test_dispositivo_1o_autorizado_e_2o_pendente_no_login(self):
        operador = Usuario.objects.create_user(
            username="operador.campo",
            email="operador@logbrasil.com.br",
            password="password123",
            first_name="Carlos",
            last_name="Campo",
            empresa=self.empresa,
            tipo_operador=TipoOperador.FUNCIONARIO,
        )
        client_op = Client()

        # 1º login em Dispositivo 1 -> nasce AUTORIZADO e permite login (redirect 302)
        resp1 = client_op.post(
            reverse("login"),
            {
                "username": "operador.campo",
                "password": "password123",
                "device_uuid": "DEV-OP-001",
                "device_model": "Galaxy A54",
            },
        )
        self.assertEqual(resp1.status_code, 302)
        disp1 = DispositivoMovel.objects.get(uuid_dispositivo="DEV-OP-001")
        self.assertEqual(disp1.usuario_responsavel, operador)
        self.assertEqual(disp1.status_autorizacao, DispositivoMovel.StatusAutorizacao.AUTORIZADO)
        self.assertIsNotNone(disp1.data_registro)
        self.assertIsNotNone(disp1.ultima_atuacao)

        # 2º login do mesmo usuário em Dispositivo 2 -> nasce PENDENTE e retém o login (status 200 com erro)
        client_op2 = Client()
        resp2 = client_op2.post(
            reverse("login"),
            {
                "username": "operador.campo",
                "password": "password123",
                "device_uuid": "DEV-OP-002",
                "device_model": "Moto G84",
            },
        )
        self.assertEqual(resp2.status_code, 200)
        disp2 = DispositivoMovel.objects.get(uuid_dispositivo="DEV-OP-002")
        self.assertEqual(disp2.usuario_responsavel, operador)
        self.assertEqual(disp2.status_autorizacao, DispositivoMovel.StatusAutorizacao.PENDENTE)

        # Gestor homologa o 2º dispositivo e o operador consegue logar
        self.client.post(
            reverse("dispositivo_status", kwargs={"pk": disp2.pk}),
            {"acao": "AUTORIZAR"},
        )
        disp2.refresh_from_db()
        self.assertEqual(disp2.status_autorizacao, DispositivoMovel.StatusAutorizacao.AUTORIZADO)

        resp2_aprovado = client_op2.post(
            reverse("login"),
            {
                "username": "operador.campo",
                "password": "password123",
                "device_uuid": "DEV-OP-002",
                "device_model": "Moto G84",
            },
        )
        self.assertEqual(resp2_aprovado.status_code, 302)

    def test_verificacao_bloqueio_no_login_web_e_api(self):
        operador = Usuario.objects.create_user(
            username="operador.bloq",
            email="bloq@logbrasil.com.br",
            password="password123",
            empresa=self.empresa,
            tipo_operador=TipoOperador.FUNCIONARIO,
        )
        disp = DispositivoMovel.objects.create(
            empresa=self.empresa,
            usuario_responsavel=operador,
            uuid_dispositivo="DEV-BLOQUEADO-99",
            modelo="Xiaomi Redmi",
            status_autorizacao=DispositivoMovel.StatusAutorizacao.BLOQUEADO,
        )

        # Tentativa de login Web com dispositivo bloqueado
        client_bloq = Client()
        resp_web = client_bloq.post(
            reverse("login"),
            {
                "username": "operador.bloq",
                "password": "password123",
                "device_uuid": "DEV-BLOQUEADO-99",
            },
        )
        self.assertEqual(resp_web.status_code, 200)
        self.assertContains(resp_web, "BLOQUEADO")

        # Tentativa de login API Mobile com dispositivo bloqueado
        resp_api = client_bloq.post(
            reverse("api_login"),
            data='{"username": "operador.bloq", "password": "password123"}',
            content_type="application/json",
            HTTP_X_DEVICE_UUID="DEV-BLOQUEADO-99",
        )
        self.assertEqual(resp_api.status_code, 403)

        # Fiscalização de inatividade (>= 30 dias sem atuação)
        from django.utils import timezone
        disp.ultima_atuacao = timezone.now() - datetime.timedelta(days=35)
        disp.save(update_fields=["ultima_atuacao"])
        self.assertTrue(disp.inativo)
        self.assertGreaterEqual(disp.dias_sem_atuacao, 35)

    def test_fluxo_4_pilares_vitrine_notificacoes_whatsapp_audit(self):
        ativo = ClasseAtivo.objects.create(
            empresa=self.empresa,
            nome_classe="Mesa Bistrô",
            categoria="Mobiliário",
            limite_minimo_itens=5,
            limite_maximo_itens=100,
        )

        # 1. Acesso à Vitrine Pública (GET)
        url_vitrine = reverse("portal_vitrine", kwargs={"subdominio": self.empresa.subdominio})
        resp_get = self.client.get(url_vitrine)
        self.assertEqual(resp_get.status_code, 200)
        self.assertContains(resp_get, "Mesa Bistrô")

        # 2. Envio de Manifestação de Interesse (POST) respeitando antecedência e limites
        data_inicio = datetime.date.today() + datetime.timedelta(days=5)
        data_fim = data_inicio + datetime.timedelta(days=2)
        resp_post = self.client.post(
            url_vitrine,
            {
                "nome_solicitante": "Eventos Corporativos S.A.",
                "documento": "11.222.333/0001-44",
                "telefone_whatsapp": "+5511999990000",
                "email_solicitante": "contato@eventoscorp.com.br",
                "cep_evento": "01001-000",
                "endereco_evento": "Av. Paulista, 1000",
                "localizacao": "https://maps.google.com/?q=-23.56,-46.65",
                "data_inicio_evento": data_inicio.isoformat(),
                "data_fim_evento": data_fim.isoformat(),
                "observacoes_cliente": "Entrega pela doca lateral",
                f"qtd_ativo_{ativo.id}": "20",
            },
        )
        self.assertEqual(resp_post.status_code, 200)
        self.assertEqual(SolicitacaoInteresse.objects.count(), 1)
        sol = SolicitacaoInteresse.objects.first()
        self.assertEqual(sol.status, SolicitacaoInteresse.StatusEsteira.RECEBIDO)

        # Verifica registro automático no HistoricoEvento (Audit Trail)
        self.assertTrue(HistoricoEvento.objects.filter(acao="SOLICITACAO_CRIADA").exists())
        self.assertTrue(HistoricoEvento.objects.filter(acao="WHATSAPP_CONFIRMACAO_ENVIADA").exists())

        # 3. Triagem Logística pelo Gestor
        resp_triagem = self.client.post(
            reverse("solicitacao_status", kwargs={"pk": sol.pk}),
            {
                "status": SolicitacaoInteresse.StatusEsteira.VIABILIDADE_APROVADA,
                "parecer_logistica": "Rota confirmada dentro da Grande SP",
                "cliente_vip": "on",
            },
        )
        self.assertEqual(resp_triagem.status_code, 302)
        sol.refresh_from_db()
        self.assertEqual(sol.status, SolicitacaoInteresse.StatusEsteira.VIABILIDADE_APROVADA)
        self.assertTrue(sol.cliente_vip)

        # 4. Disparo do Digest Executivo Diário e Central de Notificações
        resp_digest = self.client.post(reverse("central_notificacoes"), {"acao": "GERAR_DIGEST"})
        self.assertEqual(resp_digest.status_code, 302)
        self.assertTrue(
            NotificacaoInterna.objects.filter(
                tipo=NotificacaoInterna.TipoNotificacao.DIGEST_EXECUTIVO
            ).exists()
        )

        # 5. Webhook WhatsApp Bot (Opções 1, 2 e 3)
        resp_wpp = self.client.post(
            reverse("webhook_whatsapp"),
            data=f'{{"subdominio": "{self.empresa.subdominio}", "from": "+5511988887777", "text": "1"}}',
            content_type="application/json",
        )
        self.assertEqual(resp_wpp.status_code, 200)
        self.assertEqual(resp_wpp.json()["opcao_processada"], "1")
        self.assertTrue(HistoricoEvento.objects.filter(acao="WHATSAPP_TRIAGEM_RESPONDIDA").exists())

