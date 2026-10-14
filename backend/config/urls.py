"""
Roteamento principal do SIGA Web Admin e API Mobile.
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from siga_core.views import SincronizacaoAPIView, CatalogoAtivosAPIView

urlpatterns = [
    # Painel Administrativo Web
    path('admin/', admin.site.urls),

    # Autenticação padrão do DRF para testes no navegador
    path('api-auth/', include('rest_framework.urls')),

    # Endpoints da API REST para o App Mobile
    path('api/sincronizar/', SincronizacaoAPIView.as_view(), name='api_sincronizar'),
    path('api/catalogo/', CatalogoAtivosAPIView.as_view(), name='api_catalogo'),
]

# Servir uploads de fotos de contagem (mídia) em ambiente de desenvolvimento
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)