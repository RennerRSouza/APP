"""
Roteamento principal do SIGA Web Admin e API Mobile.
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.contrib.auth import views as auth_views

from siga_core.views import (
    # API Mobile (IA)
    LoginMobileAPIView,
    SincronizacaoAPIView,
    CatalogoAtivosAPIView,

    # Auth & Dashboard
    SigaLoginView,
    CadastroEmpresaView,
    DashboardView,

    # Inventários & Auditoria (UC04)
    InventarioListView,
    AuditoriaInventarioView,

    # Catálogo de Ativos (UC03)
    ClasseAtivoListView,
    ClasseAtivoCreateView,
    ClasseAtivoUpdateView,

    # Usuários & Equipe (UC01)
    UsuarioListView,
    UsuarioCreateView,
    UsuarioToggleStatusView,

    # Regras Operacionais (UC02)
    RegraOperacionalView,

    # Dispositivos Móveis (UC05)
    DispositivoListView,
    DispositivoToggleStatusView,

    # Pilares Extras (Vitrine RFQ, Notificações/Digest, Webhook WhatsApp & Audit Trail)
    PortalVitrinePublicaView,
    SolicitacaoListView,
    SolicitacaoTriagemUpdateView,
    CentralNotificacoesView,
    WhatsAppWebhookAPIView,
)

urlpatterns = [
    # 1. Dashboard Principal
    path('', DashboardView.as_view(), name='dashboard'),
    path('dashboard/', DashboardView.as_view(), name='dashboard_alias'),

    # 2. Inventários e Auditoria (UC04)
    path('inventarios/', InventarioListView.as_view(), name='inventario_list'),
    path('inventarios/<uuid:inventario_id>/', AuditoriaInventarioView.as_view(), name='inventario_auditar'),

    # 3. Catálogo de Ativos (UC03)
    path('ativos/', ClasseAtivoListView.as_view(), name='ativo_list'),
    path('ativos/novo/', ClasseAtivoCreateView.as_view(), name='ativo_novo'),
    path('ativos/<int:pk>/editar/', ClasseAtivoUpdateView.as_view(), name='ativo_editar'),

    # 4. Gestão de Usuários (UC01)
    path('usuarios/', UsuarioListView.as_view(), name='usuario_list'),
    path('usuarios/novo/', UsuarioCreateView.as_view(), name='usuario_novo'),
    path('usuarios/<uuid:pk>/status/', UsuarioToggleStatusView.as_view(), name='usuario_status'),

    # 5. Regras Operacionais da IA Mobile (UC02)
    path('regras/', RegraOperacionalView.as_view(), name='regras_config'),

    # 6. Dispositivos Móveis Homologados (UC05)
    path('dispositivos/', DispositivoListView.as_view(), name='dispositivo_list'),
    path('dispositivos/<uuid:pk>/status/', DispositivoToggleStatusView.as_view(), name='dispositivo_status'),

    # 7. Autenticação e Onboarding Web
    path('login/', SigaLoginView.as_view(), name='login'),
    path('logout/', auth_views.LogoutView.as_view(), name='logout'),
    path('cadastro-empresa/', CadastroEmpresaView.as_view(), name='cadastro_empresa'),

    # 8. Django Admin Tradicional
    path('admin/', admin.site.urls),

    # 9. Autenticação DRF (Navegador)
    path('api-auth/', include('rest_framework.urls')),

    # 10. Endpoints da API REST para o App Mobile
    path('api/login/', LoginMobileAPIView.as_view(), name='api_login'),
    path('api/sincronizar/', SincronizacaoAPIView.as_view(), name='api_sincronizar'),
    path('api/catalogo/', CatalogoAtivosAPIView.as_view(), name='api_catalogo'),

    # 11. Pilares Extras: Vitrine Pública RFQ, Triagem, Notificações & Webhook WhatsApp
    path('portal/<slug:subdominio>/', PortalVitrinePublicaView.as_view(), name='portal_vitrine'),
    path('solicitacoes/', SolicitacaoListView.as_view(), name='solicitacao_list'),
    path('solicitacoes/<uuid:pk>/status/', SolicitacaoTriagemUpdateView.as_view(), name='solicitacao_status'),
    path('notificacoes/', CentralNotificacoesView.as_view(), name='central_notificacoes'),
    path('api/webhooks/whatsapp/', WhatsAppWebhookAPIView.as_view(), name='webhook_whatsapp'),
]

# Servir uploads de fotos de contagem (mídia) em ambiente de desenvolvimento
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
