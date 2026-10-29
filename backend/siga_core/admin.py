from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.html import format_html
from .models import (
    Empresa, Usuario, Funcionario, Terceirizado,
    RegraOperacionalMobile, DispositivoMovel, ClasseAtivo,
    Inventario, ItemInventario, LogAuditoria,
    ParametrosLocacao, SolicitacaoInteresse, ItemSolicitacaoInteresse,
    NotificacaoInterna, HistoricoEvento
)


# Inlines para perfis de funcionários e terceirizados
class FuncionarioInline(admin.StackedInline):
    model = Funcionario
    can_delete = False
    verbose_name_plural = "Dados do Funcionário"


class TerceirizadoInline(admin.StackedInline):
    model = Terceirizado
    can_delete = False
    verbose_name_plural = "Dados de Terceirizado"


@admin.register(Usuario)
class CustomUsuarioAdmin(UserAdmin):
    inlines = [FuncionarioInline, TerceirizadoInline]
    list_display = ('username', 'email', 'tipo_operador', 'empresa', 'status_ativo', 'is_staff')
    list_filter = ('tipo_operador', 'status_ativo', 'empresa')
    fieldsets = UserAdmin.fieldsets + (
        ('Dados SIGA', {'fields': ('empresa', 'cpf', 'tipo_operador', 'status_ativo')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Dados SIGA', {'fields': ('empresa', 'cpf', 'tipo_operador')}),
    )


@admin.register(Empresa)
class EmpresaAdmin(admin.ModelAdmin):
    list_display = ('razao_social', 'schema_name', 'subdominio', 'status_ativo', 'criado_em')
    search_fields = ('razao_social', 'subdominio')
    list_filter = ('status_ativo',)


@admin.register(ClasseAtivo)
class ClasseAtivoAdmin(admin.ModelAdmin):
    list_display = ('nome_classe', 'categoria', 'empresa')
    list_filter = ('empresa', 'categoria')
    search_fields = ('nome_classe', 'descricao')


@admin.register(RegraOperacionalMobile)
class RegraOperacionalMobileAdmin(admin.ModelAdmin):
    list_display = (
        'empresa', 'tipo_operador_alvo', 'limite_edicao_manual_pct',
        'tolerancia_erro_ia_pct', 'exige_justificativa', 'versao'
    )
    list_filter = ('empresa', 'tipo_operador_alvo')


@admin.register(DispositivoMovel)
class DispositivoMovelAdmin(admin.ModelAdmin):
    list_display = ('uuid_dispositivo', 'modelo', 'usuario_responsavel', 'empresa', 'status_autorizacao', 'data_registro', 'ultima_atuacao')
    list_filter = ('status_autorizacao', 'empresa')
    search_fields = ('uuid_dispositivo', 'modelo', 'usuario_responsavel__username')


class ItemInventarioInline(admin.TabularInline):
    model = ItemInventario
    extra = 0
    readonly_fields = ('divergencia_display',)
    fields = (
        'classe_ativo', 'qtd_detectada_ia', 'qtd_confirmada_humano',
        'divergencia_display', 'justificativa', 'foto'
    )

    def divergencia_display(self, obj):
        pct = obj.divergencia_percentual
        color = "red" if pct > 10.0 else "green"
        return format_html('<b style="color: {};">{:.1f}%</b>', color, pct)
    divergencia_display.short_description = "Divergência"


class LogAuditoriaInline(admin.StackedInline):
    model = LogAuditoria
    extra = 1
    readonly_fields = ('data_hora',)


@admin.register(Inventario)
class InventarioAdmin(admin.ModelAdmin):
    list_display = ('id_curto', 'empresa', 'usuario', 'status_auditoria', 'data_hora_fim')
    list_filter = ('status_auditoria', 'empresa', 'data_hora_fim')
    search_fields = ('id', 'usuario__username')
    inlines = [ItemInventarioInline, LogAuditoriaInline]

    def id_curto(self, obj):
        return str(obj.id)[:8]
    id_curto.short_description = "ID Inventário"


@admin.register(ParametrosLocacao)
class ParametrosLocacaoAdmin(admin.ModelAdmin):
    list_display = ('empresa', 'regiao', 'dias_antecedencia_min', 'prazo_frete_dias_uteis')


class ItemSolicitacaoInline(admin.TabularInline):
    model = ItemSolicitacaoInteresse
    extra = 0


@admin.register(SolicitacaoInteresse)
class SolicitacaoInteresseAdmin(admin.ModelAdmin):
    list_display = ('nome_solicitante', 'empresa', 'status', 'cliente_vip', 'data_inicio_evento', 'criado_em')
    list_filter = ('status', 'cliente_vip', 'empresa')
    search_fields = ('nome_solicitante', 'documento', 'telefone_whatsapp', 'email_solicitante')
    inlines = [ItemSolicitacaoInline]


@admin.register(NotificacaoInterna)
class NotificacaoInternaAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'tipo', 'empresa', 'destinatario', 'lida', 'criado_em')
    list_filter = ('tipo', 'lida', 'empresa')


@admin.register(HistoricoEvento)
class HistoricoEventoAdmin(admin.ModelAdmin):
    list_display = ('acao', 'tipo_origem', 'canal', 'empresa', 'autor', 'criado_em')
    list_filter = ('tipo_origem', 'canal', 'empresa')
    readonly_fields = ('id', 'empresa', 'tipo_origem', 'canal', 'solicitacao_vinculada', 'autor', 'acao', 'payload', 'criado_em')