import uuid
from decimal import Decimal
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib import messages
from django.contrib.auth.mixins import LoginRequiredMixin
from django.db import transaction
from django.utils import timezone
from django.urls import reverse_lazy, reverse
from django.views import View
from django.views.generic import FormView, TemplateView, ListView, CreateView, UpdateView

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from .forms import (
    CadastroEmpresaForm, ClasseAtivoForm,
    RegraOperacionalForm, UsuarioCreateForm
)
from .models import (
    Inventario, ItemInventario, DispositivoMovel, LogAuditoria,
    Empresa, Usuario, ClasseAtivo, RegraOperacionalMobile,
    Funcionario, Terceirizado, TipoOperador
)
from .serializers import InventarioSyncSerializer


# ==============================================================================
# 1. ENDPOINTS DA API REST PARA O APP MOBILE (YOLO INVENTORY SYNC)
# ==============================================================================
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

        ativos = empresa.classes_ativos.all().values('id', 'nome_classe', 'codigo_yolo', 'categoria')
        return Response(list(ativos), status=status.HTTP_200_OK)


# ==============================================================================
# 2. ONBOARDING E ACESSO
# ==============================================================================
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
        return DispositivoMovel.objects.filter(empresa=empresa).order_by('-id') if empresa else DispositivoMovel.objects.none()


class DispositivoToggleStatusView(LoginRequiredMixin, View):
    def post(self, request, pk):
        empresa = request.user.empresa
        disp = get_object_or_404(DispositivoMovel, pk=pk, empresa=empresa)
        if disp.status_autorizacao == DispositivoMovel.StatusAutorizacao.AUTORIZADO:
            disp.status_autorizacao = DispositivoMovel.StatusAutorizacao.BLOQUEADO
        else:
            disp.status_autorizacao = DispositivoMovel.StatusAutorizacao.AUTORIZADO
        disp.save(update_fields=['status_autorizacao'])
        messages.info(request, f"Dispositivo '{disp.modelo or disp.uuid_dispositivo}' agora está {disp.status_autorizacao}.")
        return redirect('dispositivo_list')