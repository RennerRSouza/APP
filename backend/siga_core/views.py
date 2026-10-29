import hashlib
import uuid
from decimal import Decimal
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib import messages
from django.contrib.auth import authenticate
from django.contrib.auth import views as auth_views
from django.contrib.auth.mixins import LoginRequiredMixin
from django.db import transaction
from django.db.models import Case, When, Value, IntegerField
from django.utils import timezone
from django.urls import reverse_lazy, reverse
from django.views import View
from django.views.generic import FormView, TemplateView, ListView, CreateView, UpdateView

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny

from .forms import (
    CadastroEmpresaForm, ClasseAtivoForm,
    RegraOperacionalForm, UsuarioCreateForm,
    ParametrosLocacaoForm, SolicitacaoInteresseForm, NotificacaoInternaForm
)
from .models import (
    Inventario, ItemInventario, DispositivoMovel, LogAuditoria,
    Empresa, Usuario, ClasseAtivo, RegraOperacionalMobile,
    Funcionario, Terceirizado, TipoOperador,
    ParametrosLocacao, SolicitacaoInteresse, ItemSolicitacaoInteresse,
    NotificacaoInterna, HistoricoEvento
)
from .serializers import InventarioSyncSerializer


def registrar_e_verificar_dispositivo(usuario, device_uuid, device_model=''):
    """
    Registra ou atualiza um DispositivoMovel vinculado ao usuário e à sua empresa:
    - 1º dispositivo do usuário na empresa -> nasce como AUTORIZADO.
    - 2º+ dispositivo do mesmo usuário -> nasce como PENDENTE (requer homologação).
    - Dispositivo já existente -> atualiza `ultima_atuacao` (e vincula `usuario_responsavel` se vazio).
    """
    empresa = getattr(usuario, 'empresa', None)
    device_uuid = (device_uuid or '').strip()
    if not empresa or not device_uuid:
        return None, False

    modelo_limpo = (device_model or '').strip() or 'Dispositivo Mobile/Web'
    agora = timezone.now()

    dispositivo = DispositivoMovel.objects.filter(
        empresa=empresa,
        uuid_dispositivo=device_uuid
    ).first()

    if dispositivo:
        campos_update = ['ultima_atuacao']
        dispositivo.ultima_atuacao = agora
        if not dispositivo.usuario_responsavel:
            dispositivo.usuario_responsavel = usuario
            campos_update.append('usuario_responsavel')
        if device_model and (not dispositivo.modelo or dispositivo.modelo == 'Desconhecido'):
            dispositivo.modelo = modelo_limpo
            campos_update.append('modelo')
        dispositivo.save(update_fields=campos_update)
        return dispositivo, False

    ja_possui_dispositivo = DispositivoMovel.objects.filter(
        empresa=empresa,
        usuario_responsavel=usuario
    ).exists()

    status_inicial = (
        DispositivoMovel.StatusAutorizacao.PENDENTE
        if ja_possui_dispositivo
        else DispositivoMovel.StatusAutorizacao.AUTORIZADO
    )

    dispositivo = DispositivoMovel.objects.create(
        empresa=empresa,
        usuario_responsavel=usuario,
        uuid_dispositivo=device_uuid,
        modelo=modelo_limpo,
        status_autorizacao=status_inicial,
        ultima_atuacao=agora,
    )
    return dispositivo, True


# ==============================================================================
# 1. ENDPOINTS DA API REST PARA O APP MOBILE (YOLO INVENTORY SYNC)
# ==============================================================================
class LoginMobileAPIView(APIView):
    """
    Endpoint de login da API Mobile.
    Verifica se o dispositivo está bloqueado ou pendente logo no login,
    vincula o usuário responsável e atualiza a data de última atuação.
    """
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        username = request.data.get('username')
        password = request.data.get('password')
        usuario = authenticate(request, username=username, password=password)

        if not usuario:
            return Response(
                {"error": "Credenciais inválidas."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not usuario.status_ativo or not usuario.is_active:
            return Response(
                {"error": "Usuário inativo."},
                status=status.HTTP_403_FORBIDDEN
            )

        device_uuid = request.headers.get('X-Device-UUID') or request.data.get('device_uuid')
        device_model = request.headers.get('X-Device-Model') or request.data.get('device_model', 'Smartphone Mobile')

        dispositivo, criado = registrar_e_verificar_dispositivo(usuario, device_uuid, device_model)
        if dispositivo:
            if dispositivo.status_autorizacao == DispositivoMovel.StatusAutorizacao.BLOQUEADO:
                return Response(
                    {
                        "error": "Dispositivo bloqueado pela administração.",
                        "status_autorizacao": dispositivo.status_autorizacao,
                        "uuid_dispositivo": dispositivo.uuid_dispositivo,
                    },
                    status=status.HTTP_403_FORBIDDEN
                )
            if dispositivo.status_autorizacao == DispositivoMovel.StatusAutorizacao.PENDENTE:
                return Response(
                    {
                        "error": "Novo dispositivo registrado como PENDENTE. Aguarde a homologação do gestor.",
                        "status_autorizacao": dispositivo.status_autorizacao,
                        "uuid_dispositivo": dispositivo.uuid_dispositivo,
                    },
                    status=status.HTTP_403_FORBIDDEN
                )

        return Response(
            {
                "usuario": usuario.username,
                "nome": usuario.get_full_name() or usuario.username,
                "tipo_operador": usuario.tipo_operador,
                "dispositivo": {
                    "uuid": dispositivo.uuid_dispositivo if dispositivo else None,
                    "modelo": dispositivo.modelo if dispositivo else None,
                    "status_autorizacao": dispositivo.status_autorizacao if dispositivo else None,
                    "data_registro": dispositivo.data_registro.isoformat() if dispositivo else None,
                    "ultima_atuacao": dispositivo.ultima_atuacao.isoformat() if dispositivo else None,
                },
                "message": "Login realizado e dispositivo verificado com sucesso."
            },
            status=status.HTTP_200_OK
        )


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
            dispositivo, _ = registrar_e_verificar_dispositivo(
                request.user,
                device_uuid,
                request.headers.get('X-Device-Model', 'Desconhecido')
            )
            if dispositivo.status_autorizacao == DispositivoMovel.StatusAutorizacao.BLOQUEADO:
                return Response(
                    {"error": "Dispositivo bloqueado pela administração."},
                    status=status.HTTP_403_FORBIDDEN
                )
            if dispositivo.status_autorizacao == DispositivoMovel.StatusAutorizacao.PENDENTE:
                return Response(
                    {"error": "Novo dispositivo pendente de homologação pela administração."},
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

                tolerancia = regra.tolerancia_erro_ia_pct if regra else Decimal('10.0')
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
    (ex: Mesa Bistrô, Gradil) para orientar o modelo de IA local.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        empresa = getattr(request.user, 'empresa', None)
        if not empresa:
            return Response([], status=status.HTTP_200_OK)

        device_uuid = request.headers.get('X-Device-UUID')
        if device_uuid:
            dispositivo, _ = registrar_e_verificar_dispositivo(
                request.user,
                device_uuid,
                request.headers.get('X-Device-Model', 'Desconhecido')
            )
            if dispositivo and dispositivo.status_autorizacao == DispositivoMovel.StatusAutorizacao.BLOQUEADO:
                return Response(
                    {"error": "Dispositivo bloqueado pela administração."},
                    status=status.HTTP_403_FORBIDDEN
                )
            if dispositivo and dispositivo.status_autorizacao == DispositivoMovel.StatusAutorizacao.PENDENTE:
                return Response(
                    {"error": "Novo dispositivo pendente de homologação pela administração."},
                    status=status.HTTP_403_FORBIDDEN
                )

        ativos = empresa.classes_ativos.all().values('id', 'nome_classe', 'codigo_yolo', 'categoria')
        return Response(list(ativos), status=status.HTTP_200_OK)


# ==============================================================================
# 2. ONBOARDING E ACESSO
# ==============================================================================
class SigaLoginView(auth_views.LoginView):
    """
    Login customizado que vincula o dispositivo ao usuário responsável,
    verifica se o dispositivo está BLOQUEADO logo no login e registra
    o 2º dispositivo do mesmo usuário como PENDENTE de homologação.
    """
    template_name = 'auth/login.html'

    def form_valid(self, form):
        usuario = form.get_user()
        empresa = getattr(usuario, 'empresa', None)

        if empresa:
            header_uuid = (self.request.headers.get('X-Device-UUID') or '').strip()
            post_uuid = (self.request.POST.get('device_uuid') or '').strip()
            device_model = (
                self.request.POST.get('device_model')
                or self.request.headers.get('X-Device-Model')
                or ''
            ).strip()

            if not device_model:
                ua = self.request.META.get('HTTP_USER_AGENT', '')
                device_model = ua[:80] if ua else 'Navegador Web'

            if header_uuid:
                device_uuid = header_uuid
            elif post_uuid:
                # Se o UUID veio do navegador (WEB-...), garante escopo por usuário
                # caso outro usuário da mesma máquina já tenha usado esse navegador
                conflito_outro_usuario = DispositivoMovel.objects.filter(
                    uuid_dispositivo=post_uuid
                ).exclude(usuario_responsavel=usuario).exists()
                if conflito_outro_usuario:
                    device_uuid = f"{post_uuid}-{usuario.username.upper()}"
                else:
                    device_uuid = post_uuid
            else:
                ua = self.request.META.get('HTTP_USER_AGENT', 'web')
                ip = self.request.META.get('REMOTE_ADDR', '127.0.0.1')
                hash_curto = hashlib.sha256(f"{ua}:{ip}:{usuario.username}".encode()).hexdigest()[:8].upper()
                device_uuid = f"WEB-{hash_curto}"

            dispositivo, _ = registrar_e_verificar_dispositivo(usuario, device_uuid, device_model)
            if dispositivo:
                if dispositivo.status_autorizacao == DispositivoMovel.StatusAutorizacao.BLOQUEADO:
                    form.add_error(
                        None,
                        f"Acesso negado: este dispositivo ({dispositivo.uuid_dispositivo}) está BLOQUEADO pela administração."
                    )
                    return self.form_invalid(form)

                if dispositivo.status_autorizacao == DispositivoMovel.StatusAutorizacao.PENDENTE:
                    form.add_error(
                        None,
                        f"Novo dispositivo detectado ({dispositivo.uuid_dispositivo}). "
                        f"O pedido de homologação foi registrado como PENDENTE e aguarda liberação do gestor."
                    )
                    return self.form_invalid(form)

        return super().form_valid(form)


class CadastroEmpresaView(FormView):
    template_name = 'auth/cadastro_empresa.html'
    form_class = CadastroEmpresaForm
    success_url = reverse_lazy('login')

    def form_valid(self, form):
        data = form.cleaned_data
        subdominio = data['subdominio']
        schema_name = subdominio.replace('-', '_')

        with transaction.atomic():
            empresa = Empresa.objects.create(
                razao_social=data['razao_social'],
                subdominio=subdominio,
                schema_name=schema_name,
                status_ativo=True,
            )

            Usuario.objects.create_user(
                username=data['username'],
                email=data['email'],
                password=data['password1'],
                first_name=data['first_name'],
                last_name=data['last_name'],
                empresa=empresa,
                tipo_operador=TipoOperador.GESTOR,
                status_ativo=True,
            )

            RegraOperacionalMobile.objects.create(
                empresa=empresa,
                tipo_operador_alvo=TipoOperador.FUNCIONARIO,
                limite_edicao_manual_pct=Decimal('20.0'),
                tolerancia_erro_ia_pct=Decimal('10.0'),
                exige_justificativa=True,
                versao=1,
            )
            RegraOperacionalMobile.objects.create(
                empresa=empresa,
                tipo_operador_alvo=TipoOperador.TERCEIRIZADO,
                limite_edicao_manual_pct=Decimal('5.0'),
                tolerancia_erro_ia_pct=Decimal('10.0'),
                exige_justificativa=True,
                versao=1,
            )

            ClasseAtivo.objects.create(
                empresa=empresa,
                nome_classe="Mesa Bistrô",
                codigo_yolo="mesa_bistro",
                categoria="Mobiliário",
            )
            ClasseAtivo.objects.create(
                empresa=empresa,
                nome_classe="Gradil",
                codigo_yolo="gradil",
                categoria="Estruturas e Segurança",
            )

        messages.success(
            self.request,
            f"Locadora '{empresa.razao_social}' cadastrada com sucesso! Faça login com o usuário criado para gerenciar seus ativos."
        )
        return super().form_valid(form)


# ==============================================================================
# 3. DASHBOARD ANALÍTICO
# ==============================================================================
class DashboardView(LoginRequiredMixin, TemplateView):
    template_name = 'core/dashboard.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        empresa = getattr(self.request.user, 'empresa', None)

        if not empresa:
            context['sem_empresa'] = True
            return context

        inventarios_qs = Inventario.objects.filter(empresa=empresa)
        total_inventarios = inventarios_qs.count()
        total_divergentes = inventarios_qs.filter(
            status_auditoria=Inventario.StatusAuditoria.DIVERGENTE
        ).count()
        total_em_analise = inventarios_qs.filter(
            status_auditoria=Inventario.StatusAuditoria.EM_ANALISE
        ).count()
        total_aprovados = inventarios_qs.filter(
            status_auditoria=Inventario.StatusAuditoria.APROVADO
        ).count()

        conformidade_ia = 100.0
        if total_inventarios > 0:
            conformidade_ia = ((total_inventarios - total_divergentes) / total_inventarios) * 100.0

        context.update({
            'empresa': empresa,
            'total_inventarios': total_inventarios,
            'total_divergentes': total_divergentes,
            'total_em_analise': total_em_analise,
            'total_aprovados': total_aprovados,
            'conformidade_ia': conformidade_ia,
            'total_ativos': ClasseAtivo.objects.filter(empresa=empresa).count(),
            'total_dispositivos': DispositivoMovel.objects.filter(empresa=empresa).count(),
            'total_usuarios': Usuario.objects.filter(empresa=empresa).count(),
            'ultimos_inventarios': inventarios_qs.select_related('usuario', 'dispositivo').order_by('-data_hora_fim')[:5],
        })
        return context


# ==============================================================================
# 4. MÓDULO DE INVENTÁRIOS E AUDITORIA (UC04)
# ==============================================================================
class InventarioListView(LoginRequiredMixin, ListView):
    model = Inventario
    template_name = 'inventarios/inventario_list.html'
    context_object_name = 'inventarios'
    paginate_by = 15

    def get_queryset(self):
        empresa = getattr(self.request.user, 'empresa', None)
        if not empresa:
            return Inventario.objects.none()

        qs = Inventario.objects.filter(empresa=empresa).select_related(
            'usuario', 'dispositivo'
        ).prefetch_related('itens__classe_ativo').order_by('-data_hora_fim')

        status_filtro = self.request.GET.get('status')
        if status_filtro and status_filtro in Inventario.StatusAuditoria.values:
            qs = qs.filter(status_auditoria=status_filtro)

        return qs

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        empresa = getattr(self.request.user, 'empresa', None)
        context['status_atual'] = self.request.GET.get('status', 'TODOS')
        context['status_choices'] = Inventario.StatusAuditoria.choices
        if empresa:
            context['total_divergentes'] = Inventario.objects.filter(
                empresa=empresa, status_auditoria=Inventario.StatusAuditoria.DIVERGENTE
            ).count()
        return context


class AuditoriaInventarioView(LoginRequiredMixin, View):
    template_name = 'inventarios/auditoria_detalhe.html'

    def get_object(self, inventario_id):
        empresa = getattr(self.request.user, 'empresa', None)
        return get_object_or_404(
            Inventario.objects.select_related('usuario', 'dispositivo', 'empresa'),
            id=inventario_id,
            empresa=empresa
        )

    def get(self, request, inventario_id):
        inventario = self.get_object(inventario_id)
        itens = inventario.itens.select_related('classe_ativo').all()
        logs = inventario.logs_auditoria.select_related('usuario_auditor').all()

        return render(request, self.template_name, {
            'inventario': inventario,
            'itens': itens,
            'logs': logs,
        })

    def post(self, request, inventario_id):
        inventario = self.get_object(inventario_id)
        acao = request.POST.get('acao')
        parecer = (request.POST.get('parecer') or '').strip()

        if not parecer:
            messages.error(request, "O parecer do auditor é obrigatório para registrar a avaliação.")
            return redirect('inventario_auditar', inventario_id=inventario.id)

        with transaction.atomic():
            novo_status = (
                Inventario.StatusAuditoria.APROVADO if acao == 'APROVAR'
                else Inventario.StatusAuditoria.REJEITADO
            )
            inventario.status_auditoria = novo_status
            inventario.save(update_fields=['status_auditoria'])

            LogAuditoria.objects.create(
                inventario=inventario,
                usuario_auditor=request.user,
                parecer=parecer
            )

        status_label = "aprovado" if novo_status == Inventario.StatusAuditoria.APROVADO else "rejeitado"
        messages.success(request, f"Inventário avaliado com sucesso! Status alterado para: {status_label.upper()}.")
        return redirect('inventario_auditar', inventario_id=inventario.id)


# ==============================================================================
# 5. MÓDULO DE ATIVOS (UC03)
# ==============================================================================
class ClasseAtivoListView(LoginRequiredMixin, ListView):
    model = ClasseAtivo
    template_name = 'ativos/ativo_list.html'
    context_object_name = 'ativos'

    def get_queryset(self):
        empresa = getattr(self.request.user, 'empresa', None)
        return ClasseAtivo.objects.filter(empresa=empresa).order_by('nome_classe') if empresa else ClasseAtivo.objects.none()


class ClasseAtivoCreateView(LoginRequiredMixin, CreateView):
    model = ClasseAtivo
    form_class = ClasseAtivoForm
    template_name = 'ativos/ativo_form.html'
    success_url = reverse_lazy('ativo_list')

    def form_valid(self, form):
        form.instance.empresa = self.request.user.empresa
        messages.success(self.request, f"Ativo '{form.instance.nome_classe}' cadastrado com sucesso!")
        return super().form_valid(form)


class ClasseAtivoUpdateView(LoginRequiredMixin, UpdateView):
    model = ClasseAtivo
    form_class = ClasseAtivoForm
    template_name = 'ativos/ativo_form.html'
    success_url = reverse_lazy('ativo_list')

    def get_queryset(self):
        empresa = getattr(self.request.user, 'empresa', None)
        return ClasseAtivo.objects.filter(empresa=empresa)


# ==============================================================================
# 6. MÓDULO DE USUÁRIOS E EQUIPE (UC01)
# ==============================================================================
class UsuarioListView(LoginRequiredMixin, ListView):
    model = Usuario
    template_name = 'usuarios/usuario_list.html'
    context_object_name = 'usuarios'

    def get_queryset(self):
        empresa = getattr(self.request.user, 'empresa', None)
        if not empresa:
            return Usuario.objects.none()
        return Usuario.objects.filter(empresa=empresa).select_related(
            'perfil_funcionario', 'perfil_terceirizado'
        ).order_by('-date_joined')


class UsuarioCreateView(LoginRequiredMixin, FormView):
    template_name = 'usuarios/usuario_form.html'
    form_class = UsuarioCreateForm
    success_url = reverse_lazy('usuario_list')

    def form_valid(self, form):
        empresa = self.request.user.empresa
        data = form.cleaned_data

        with transaction.atomic():
            user = Usuario.objects.create_user(
                username=data['username'],
                email=data['email'],
                password=data['password'],
                first_name=data['first_name'],
                last_name=data['last_name'],
                empresa=empresa,
                tipo_operador=data['tipo_operador'],
                status_ativo=True,
            )

            if data['tipo_operador'] == TipoOperador.FUNCIONARIO:
                Funcionario.objects.create(
                    usuario=user,
                    matricula=data.get('matricula') or f"MAT-{user.username}",
                    departamento=data.get('departamento', '')
                )
            elif data['tipo_operador'] == TipoOperador.TERCEIRIZADO:
                Terceirizado.objects.create(
                    usuario=user,
                    empresa_prestadora=data.get('empresa_prestadora') or 'Prestadora Externa',
                    tipo_contrato=data.get('tipo_contrato') or Terceirizado.TipoContrato.TEMPORARIO,
                    dias_acesso_ano=data.get('dias_acesso_ano') or 365,
                    data_fim_contrato=data.get('data_fim_contrato') or timezone.now().date()
                )

        messages.success(self.request, f"Usuário '{user.username}' adicionado à equipe com sucesso!")
        return super().form_valid(form)


class UsuarioToggleStatusView(LoginRequiredMixin, View):
    def post(self, request, pk):
        empresa = request.user.empresa
        user = get_object_or_404(Usuario, pk=pk, empresa=empresa)
        user.status_ativo = not user.status_ativo
        user.save(update_fields=['status_ativo'])
        status_txt = "ativado" if user.status_ativo else "desativado"
        messages.info(request, f"Usuário '{user.username}' {status_txt}.")
        return redirect('usuario_list')


# ==============================================================================
# 7. MÓDULO DE REGRAS OPERACIONAIS (UC02)
# ==============================================================================
class RegraOperacionalView(LoginRequiredMixin, View):
    template_name = 'regras/regras_form.html'

    def get_regras(self, empresa):
        regra_func, _ = RegraOperacionalMobile.objects.get_or_create(
            empresa=empresa, tipo_operador_alvo=TipoOperador.FUNCIONARIO,
            defaults={'limite_edicao_manual_pct': Decimal('20.0'), 'tolerancia_erro_ia_pct': Decimal('10.0')}
        )
        regra_terc, _ = RegraOperacionalMobile.objects.get_or_create(
            empresa=empresa, tipo_operador_alvo=TipoOperador.TERCEIRIZADO,
            defaults={'limite_edicao_manual_pct': Decimal('5.0'), 'tolerancia_erro_ia_pct': Decimal('10.0')}
        )
        return regra_func, regra_terc

    def get(self, request):
        empresa = request.user.empresa
        regra_func, regra_terc = self.get_regras(empresa)
        return render(request, self.template_name, {
            'form_func': RegraOperacionalForm(instance=regra_func, prefix='func'),
            'form_terc': RegraOperacionalForm(instance=regra_terc, prefix='terc'),
        })

    def post(self, request):
        empresa = request.user.empresa
        regra_func, regra_terc = self.get_regras(empresa)
        form_func = RegraOperacionalForm(request.POST, instance=regra_func, prefix='func')
        form_terc = RegraOperacionalForm(request.POST, instance=regra_terc, prefix='terc')

        if form_func.is_valid() and form_terc.is_valid():
            with transaction.atomic():
                rf = form_func.save(commit=False)
                rf.versao += 1
                rf.save()

                rt = form_terc.save(commit=False)
                rt.versao += 1
                rt.save()

            messages.success(request, "Regras operacionais da IA e limites de perfil atualizados com sucesso!")
            return redirect('regras_config')

        return render(request, self.template_name, {
            'form_func': form_func,
            'form_terc': form_terc,
        })


# ==============================================================================
# 8. MÓDULO DE DISPOSITIVOS MÓVEIS (UC05)
# ==============================================================================
class DispositivoListView(LoginRequiredMixin, ListView):
    model = DispositivoMovel
    template_name = 'dispositivos/dispositivo_list.html'
    context_object_name = 'dispositivos'

    def get_queryset(self):
        empresa = getattr(self.request.user, 'empresa', None)
        if not empresa:
            return DispositivoMovel.objects.none()

        return (
            DispositivoMovel.objects.filter(empresa=empresa)
            .select_related('usuario_responsavel')
            .annotate(
                ordem_pendente=Case(
                    When(status_autorizacao=DispositivoMovel.StatusAutorizacao.PENDENTE, then=Value(0)),
                    default=Value(1),
                    output_field=IntegerField(),
                )
            )
            .order_by('ordem_pendente', '-ultima_atuacao')
        )


class DispositivoToggleStatusView(LoginRequiredMixin, View):
    def post(self, request, pk):
        empresa = request.user.empresa
        disp = get_object_or_404(DispositivoMovel, pk=pk, empresa=empresa)
        acao = request.POST.get('acao')

        if acao == 'BLOQUEAR':
            disp.status_autorizacao = DispositivoMovel.StatusAutorizacao.BLOQUEADO
        elif acao == 'AUTORIZAR':
            disp.status_autorizacao = DispositivoMovel.StatusAutorizacao.AUTORIZADO
        else:
            if disp.status_autorizacao == DispositivoMovel.StatusAutorizacao.AUTORIZADO:
                disp.status_autorizacao = DispositivoMovel.StatusAutorizacao.BLOQUEADO
            else:
                disp.status_autorizacao = DispositivoMovel.StatusAutorizacao.AUTORIZADO

        disp.save(update_fields=['status_autorizacao'])
        messages.info(request, f"Dispositivo '{disp.modelo or disp.uuid_dispositivo}' agora está {disp.status_autorizacao}.")
        return redirect('dispositivo_list')

# ==============================================================================
# 9. PILAR 1: PORTAL EXTERNO (VITRINE RFQ) E ESTEIRA DE TRIAGEM LOGÍSTICA
# ==============================================================================
class PortalVitrinePublicaView(View):
    """
    Vitrine pública parametrizada (/portal/<subdominio>/) onde o cliente externo
    consulta os ativos da locadora e envia uma Manifestação de Interesse (RFQ)
    sem compromisso contratual imediato.
    """
    template_name = 'portal/vitrine_publica.html'

    def get_empresa_e_parametros(self, subdominio):
        empresa = get_object_or_404(Empresa, subdominio__iexact=subdominio, status_ativo=True)
        parametros, _ = ParametrosLocacao.objects.get_or_create(empresa=empresa)
        return empresa, parametros

    def get(self, request, subdominio):
        empresa, parametros = self.get_empresa_e_parametros(subdominio)
        ativos = ClasseAtivo.objects.filter(empresa=empresa).order_by('nome_classe')
        form = SolicitacaoInteresseForm(empresa=empresa, initial={
            'telefone_whatsapp': request.GET.get('wpp', ''),
            'nome_solicitante': request.GET.get('nome', ''),
        })
        return render(request, self.template_name, {
            'empresa': empresa,
            'parametros': parametros,
            'ativos': ativos,
            'form': form,
            'token_wpp': request.GET.get('token', ''),
        })

    def post(self, request, subdominio):
        empresa, parametros = self.get_empresa_e_parametros(subdominio)
        ativos = ClasseAtivo.objects.filter(empresa=empresa).order_by('nome_classe')
        form = SolicitacaoInteresseForm(request.POST, empresa=empresa)

        # Coleta e valida quantidades dos ativos selecionados na vitrine
        itens_selecionados = []
        erro_itens = None
        for ativo in ativos:
            raw_qtd = request.POST.get(f'qtd_ativo_{ativo.id}', '0').strip()
            qtd = int(raw_qtd) if raw_qtd.isdigit() else 0
            if qtd > 0:
                if qtd < ativo.limite_minimo_itens or qtd > ativo.limite_maximo_itens:
                    erro_itens = (
                        f"O ativo '{ativo.nome_classe}' exige quantidade entre "
                        f"{ativo.limite_minimo_itens} e {ativo.limite_maximo_itens} unidades."
                    )
                    break
                itens_selecionados.append((ativo, qtd))

        if not itens_selecionados and not erro_itens:
            erro_itens = "Selecione ao menos um ativo e informe a quantidade desejada para o evento."

        if form.is_valid() and not erro_itens:
            with transaction.atomic():
                solicitacao = form.save(commit=False)
                solicitacao.empresa = empresa
                solicitacao.token_rastreio = request.POST.get('token_wpp', '') or uuid.uuid4().hex[:12]
                solicitacao.save()

                resumo_itens = {}
                for ativo, qtd in itens_selecionados:
                    ItemSolicitacaoInteresse.objects.create(
                        solicitacao=solicitacao,
                        classe_ativo=ativo,
                        quantidade_solicitada=qtd
                    )
                    resumo_itens[ativo.nome_classe] = qtd

                # Pilar 4: Registra na Trilha de Auditoria Imutável (Append-Only)
                HistoricoEvento.objects.create(
                    empresa=empresa,
                    tipo_origem=HistoricoEvento.TipoOrigem.PORTAL_EXTERNO,
                    canal=HistoricoEvento.CanalComunicacao.INTERNO,
                    solicitacao_vinculada=solicitacao,
                    acao='SOLICITACAO_CRIADA',
                    payload={
                        'solicitante': solicitacao.nome_solicitante,
                        'whatsapp': solicitacao.telefone_whatsapp,
                        'data_inicio': str(solicitacao.data_inicio_evento),
                        'itens': resumo_itens,
                    }
                )

                # Pilar 3: Simula disparo reativo de confirmação no WhatsApp e grava no Audit Trail
                msg_reativa = (
                    f"Olá {solicitacao.nome_solicitante}! Recebemos sua consulta para o evento em "
                    f"{solicitacao.data_inicio_evento:%d/%m/%Y}. Nossa equipe logística está calculando "
                    f"a viabilidade de rota e retornará em até 24h úteis."
                )
                HistoricoEvento.objects.create(
                    empresa=empresa,
                    tipo_origem=HistoricoEvento.TipoOrigem.WHATSAPP_BOT,
                    canal=HistoricoEvento.CanalComunicacao.WHATSAPP,
                    solicitacao_vinculada=solicitacao,
                    acao='WHATSAPP_CONFIRMACAO_ENVIADA',
                    payload={'telefone': solicitacao.telefone_whatsapp, 'mensagem': msg_reativa}
                )

            return render(request, self.template_name, {
                'empresa': empresa,
                'parametros': parametros,
                'ativos': ativos,
                'sucesso_solicitacao': solicitacao,
                'msg_whatsapp_simulada': msg_reativa,
            })

        return render(request, self.template_name, {
            'empresa': empresa,
            'parametros': parametros,
            'ativos': ativos,
            'form': form,
            'erro_itens': erro_itens,
        })


class SolicitacaoListView(LoginRequiredMixin, ListView):
    """Painel do Gestor com a esteira de Manifestações de Interesse (RFQ) e parâmetros da vitrine."""
    model = SolicitacaoInteresse
    template_name = 'solicitacoes/solicitacao_list.html'
    context_object_name = 'solicitacoes'

    def get_queryset(self):
        empresa = getattr(self.request.user, 'empresa', None)
        if not empresa:
            return SolicitacaoInteresse.objects.none()
        qs = SolicitacaoInteresse.objects.filter(empresa=empresa).prefetch_related('itens__classe_ativo')
        status_f = self.request.GET.get('status')
        if status_f and status_f in SolicitacaoInteresse.StatusEsteira.values:
            qs = qs.filter(status=status_f)
        return qs

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        empresa = getattr(self.request.user, 'empresa', None)
        if empresa:
            parametros, _ = ParametrosLocacao.objects.get_or_create(empresa=empresa)
            context['form_parametros'] = ParametrosLocacaoForm(instance=parametros)
            context['parametros'] = parametros
        context['status_atual'] = self.request.GET.get('status', 'TODOS')
        context['status_choices'] = SolicitacaoInteresse.StatusEsteira.choices
        return context

    def post(self, request, *args, **kwargs):
        empresa = getattr(request.user, 'empresa', None)
        parametros, _ = ParametrosLocacao.objects.get_or_create(empresa=empresa)
        form = ParametrosLocacaoForm(request.POST, instance=parametros)
        if form.is_valid():
            form.save()
            HistoricoEvento.objects.create(
                empresa=empresa,
                tipo_origem=HistoricoEvento.TipoOrigem.SISTEMA_WEB,
                canal=HistoricoEvento.CanalComunicacao.INTERNO,
                autor=request.user,
                acao='PARAMETROS_VITRINE_ATUALIZADOS',
                payload={'regiao': parametros.regiao, 'dias_antecedencia_min': parametros.dias_antecedencia_min}
            )
            messages.success(request, "Parâmetros da Vitrine Pública atualizados com sucesso!")
        else:
            messages.error(request, "Erro ao atualizar parâmetros da vitrine.")
        return redirect('solicitacao_list')


class SolicitacaoTriagemUpdateView(LoginRequiredMixin, View):
    """Avança ou cancela uma Solicitação de Interesse na esteira logística e grava no Audit Trail."""
    def post(self, request, pk):
        empresa = request.user.empresa
        solicitacao = get_object_or_404(SolicitacaoInteresse, pk=pk, empresa=empresa)
        novo_status = request.POST.get('status')
        parecer = (request.POST.get('parecer_logistica') or '').strip()
        cliente_vip = request.POST.get('cliente_vip') == 'on'

        if novo_status in SolicitacaoInteresse.StatusEsteira.values:
            status_anterior = solicitacao.status
            with transaction.atomic():
                solicitacao.status = novo_status
                solicitacao.parecer_logistica = parecer
                solicitacao.cliente_vip = cliente_vip
                solicitacao.save()

                HistoricoEvento.objects.create(
                    empresa=empresa,
                    tipo_origem=HistoricoEvento.TipoOrigem.SISTEMA_WEB,
                    canal=HistoricoEvento.CanalComunicacao.INTERNO,
                    solicitacao_vinculada=solicitacao,
                    autor=request.user,
                    acao='STATUS_ESTEIRA_ALTERADO',
                    payload={
                        'de': status_anterior,
                        'para': novo_status,
                        'parecer_logistica': parecer,
                        'cliente_vip': cliente_vip,
                    }
                )

                if cliente_vip:
                    NotificacaoInterna.objects.create(
                        empresa=empresa,
                        tipo=NotificacaoInterna.TipoNotificacao.ALERTA_CRITICO,
                        titulo=f"Solicitação Corporativa VIP: {solicitacao.nome_solicitante}",
                        mensagem=f"Demanda marcada como prioritária ({solicitacao.get_status_display()}). Evento em {solicitacao.data_inicio_evento:%d/%m/%Y}."
                    )

            messages.success(request, f"Solicitação de '{solicitacao.nome_solicitante}' movida para {solicitacao.get_status_display()}.")
        return redirect('solicitacao_list')


# ==============================================================================
# 10. PILAR 2 & 4: CENTRAL DE NOTIFICAÇÕES, DIGEST EXECUTIVO E TRILHA DE AUDITORIA
# ==============================================================================
class CentralNotificacoesView(LoginRequiredMixin, View):
    """
    Exibe o Mural de Comunicados para a equipe, Alertas Críticos Anti-Ruído para o Diretor,
    disparo do Resumo Executivo Diário (Digest) e a Trilha Imutável de Eventos (Audit Trail).
    """
    template_name = 'notificacoes/central_notificacoes.html'

    def get(self, request):
        empresa = getattr(request.user, 'empresa', None)
        notificacoes = NotificacaoInterna.objects.filter(empresa=empresa).select_related('destinatario')[:30] if empresa else []
        eventos = HistoricoEvento.objects.filter(empresa=empresa).select_related('autor', 'solicitacao_vinculada')[:40] if empresa else []
        form = NotificacaoInternaForm(empresa=empresa)
        return render(request, self.template_name, {
            'notificacoes': notificacoes,
            'eventos': eventos,
            'form': form,
        })

    def post(self, request):
        empresa = getattr(request.user, 'empresa', None)
        acao = request.POST.get('acao')

        if acao == 'GERAR_DIGEST':
            # Consolida indicadores executivos para o Dono/Diretor (Filtro Anti-Ruído)
            hoje = timezone.now().date()
            limite_vencimento = hoje + timezone.timedelta(days=15)
            novas_rfq = SolicitacaoInteresse.objects.filter(
                empresa=empresa, status=SolicitacaoInteresse.StatusEsteira.RECEBIDO
            ).count()
            divergencias_abertas = Inventario.objects.filter(
                empresa=empresa, status_auditoria=Inventario.StatusAuditoria.DIVERGENTE
            ).count()
            contratos_vencendo = Terceirizado.objects.filter(
                usuario__empresa=empresa, data_fim_contrato__lte=limite_vencimento
            ).count()

            resumo_texto = (
                f"Resumo Executivo Matinal ({hoje:%d/%m/%Y}): "
                f"{novas_rfq} nova(s) manifestação(ões) de interesse aguardando triagem | "
                f"{divergencias_abertas} divergência(s) crítica(s) pendente(s) | "
                f"{contratos_vencendo} contrato(s) de terceirizados vencendo nos próximos 15 dias."
            )

            with transaction.atomic():
                NotificacaoInterna.objects.create(
                    empresa=empresa,
                    destinatario=request.user,
                    tipo=NotificacaoInterna.TipoNotificacao.DIGEST_EXECUTIVO,
                    titulo=f"Digest Executivo Diário - {hoje:%d/%m/%Y}",
                    mensagem=resumo_texto
                )
                HistoricoEvento.objects.create(
                    empresa=empresa,
                    tipo_origem=HistoricoEvento.TipoOrigem.SISTEMA_WEB,
                    canal=HistoricoEvento.CanalComunicacao.EMAIL,
                    autor=request.user,
                    acao='EMAIL_DIGEST_ENVIADO',
                    payload={
                        'novas_solicitacoes': novas_rfq,
                        'divergencias_abertas': divergencias_abertas,
                        'contratos_vencendo_15d': contratos_vencendo,
                    }
                )
            messages.success(request, "Digest Executivo Diário consolidado e disparado com sucesso!")
            return redirect('central_notificacoes')

        form = NotificacaoInternaForm(request.POST, empresa=empresa)
        if form.is_valid():
            aviso = form.save(commit=False)
            aviso.empresa = empresa
            aviso.save()
            HistoricoEvento.objects.create(
                empresa=empresa,
                tipo_origem=HistoricoEvento.TipoOrigem.SISTEMA_WEB,
                canal=HistoricoEvento.CanalComunicacao.INTERNO,
                autor=request.user,
                acao='COMUNICADO_INTERNO_PUBLICADO',
                payload={'titulo': aviso.titulo, 'tipo': aviso.tipo}
            )
            messages.success(request, "Comunicado / notificação publicado com sucesso!")
        return redirect('central_notificacoes')


# ==============================================================================
# 11. PILAR 3: AUTOMAÇÃO WHATSAPP ENTERPRISE (META CLOUD API / WEBHOOK)
# ==============================================================================
class WhatsAppWebhookAPIView(APIView):
    """
    Webhook Inbound (/api/webhooks/whatsapp/) para integração com Meta Cloud API.
    Responde automaticamente às 3 opções do menu de triagem sem sobrecarregar o dono:
    1 - Regras de Entrega e Região de Atendimento
    2 - Catálogo de Ativos Homologados
    3 - Link Pré-identificado para Manifestação de Interesse (RFQ)
    """
    permission_classes = [AllowAny]

    def get(self, request):
        # Validação oficial do Webhook Meta Cloud API (hub.verify_token & hub.challenge)
        mode = request.GET.get('hub.mode')
        challenge = request.GET.get('hub.challenge')
        if mode == 'subscribe' and challenge:
            return Response(int(challenge) if challenge.isdigit() else challenge, status=status.HTTP_200_OK)
        return Response({'status': 'webhook_whatsapp_ativo', 'opcoes': ['1', '2', '3']}, status=status.HTTP_200_OK)

    def post(self, request):
        subdominio = request.data.get('subdominio')
        empresa = (
            Empresa.objects.filter(subdominio__iexact=subdominio).first()
            if subdominio else Empresa.objects.filter(status_ativo=True).first()
        )
        if not empresa:
            return Response({'erro': 'Nenhuma locadora ativa encontrada.'}, status=status.HTTP_404_NOT_FOUND)

        parametros, _ = ParametrosLocacao.objects.get_or_create(empresa=empresa)
        telefone = request.data.get('from', '+5511999999999')
        nome_cliente = request.data.get('nome', 'Cliente')
        opcao = str(request.data.get('text', '')).strip()

        if opcao == '1':
            resposta = (
                f"[{empresa.razao_social}] Regras Logísticas: "
                f"Atendemos {parametros.regiao}. "
                f"Antecedência mínima: {parametros.dias_antecedencia_min} dia(s). "
                f"Janela estimada de frete: {parametros.prazo_frete_dias_uteis} dia(s) úteis."
            )
        elif opcao == '2':
            nomes_ativos = list(empresa.classes_ativos.values_list('nome_classe', flat=True))
            lista_str = ", ".join(nomes_ativos) if nomes_ativos else "Consulte nossa vitrine online"
            resposta = f"[{empresa.razao_social}] Catálogo de Ativos Disponíveis: {lista_str}."
        elif opcao == '3':
            token = uuid.uuid4().hex[:10]
            url_vitrine = request.build_absolute_uri(
                reverse('portal_vitrine', kwargs={'subdominio': empresa.subdominio})
            ) + f"?wpp={telefone}&nome={nome_cliente}&token={token}"
            resposta = (
                f"[{empresa.razao_social}] Acesse seu link pré-identificado para registrar sua "
                f"Manifestação de Interesse: {url_vitrine}"
            )
        else:
            resposta = (
                f"Olá {nome_cliente}! Bem-vindo ao atendimento automático da {empresa.razao_social}. "
                f"Escolha uma opção:\n"
                f"1 - Regras de Entrega e Região de Atendimento\n"
                f"2 - Consultar Catálogo de Ativos Disponíveis\n"
                f"3 - Enviar Manifestação de Interesse (Link de Cotação)"
            )

        HistoricoEvento.objects.create(
            empresa=empresa,
            tipo_origem=HistoricoEvento.TipoOrigem.WHATSAPP_BOT,
            canal=HistoricoEvento.CanalComunicacao.WHATSAPP,
            acao='WHATSAPP_TRIAGEM_RESPONDIDA',
            payload={'telefone': telefone, 'opcao_recebida': opcao, 'resposta_bot': resposta}
        )

        return Response({
            'empresa': empresa.razao_social,
            'telefone': telefone,
            'opcao_processada': opcao,
            'resposta_bot': resposta,
        }, status=status.HTTP_200_OK)