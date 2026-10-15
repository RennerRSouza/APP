import uuid
from decimal import Decimal
from django.db import models
from django.contrib.auth.models import AbstractUser


# MULTI-TENANT (EMPRESA)
class Empresa(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    razao_social = models.CharField(max_length=255)
    schema_name = models.CharField(max_length=63, unique=True, help_text="Identificador único para schema/tenant")
    subdominio = models.CharField(max_length=63, unique=True)
    status_ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.razao_social} ({self.subdominio})"

# USUÁRIOS E ESPECIALIZAÇÕES (FUNCIONÁRIO / TERCEIRIZADO)
class TipoOperador(models.TextChoices):
    GESTOR = 'GESTOR', 'Gestor'
    FUNCIONARIO = 'FUNCIONARIO', 'Funcionário'
    TERCEIRIZADO = 'TERCEIRIZADO', 'Terceirizado'


class Usuario(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name='usuarios', null=True, blank=True)
    cpf = models.CharField(max_length=14, unique=True, null=True, blank=True)
    tipo_operador = models.CharField(max_length=20, choices=TipoOperador.choices, default=TipoOperador.FUNCIONARIO)
    status_ativo = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.get_full_name() or self.username} [{self.get_tipo_operador_display()}]"


class Funcionario(models.Model):
    usuario = models.OneToOneField(Usuario, on_delete=models.CASCADE, primary_key=True, related_name='perfil_funcionario')
    matricula = models.CharField(max_length=50, unique=True)
    departamento = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return f"Matrícula: {self.matricula} - {self.usuario.username}"


class Terceirizado(models.Model):
    class TipoContrato(models.TextChoices):
        DIARIA = 'DIARIA', 'Por Diária / Evento'
        TEMPORARIO = 'TEMPORARIO', 'Temporário (Meses)'
        ANUAL = 'ANUAL', 'Contrato Anual'

    usuario = models.OneToOneField(Usuario, on_delete=models.CASCADE, primary_key=True, related_name='perfil_terceirizado')
    empresa_prestadora = models.CharField(max_length=150)
    tipo_contrato = models.CharField(max_length=20, choices=TipoContrato.choices, default=TipoContrato.TEMPORARIO)
    dias_acesso_ano = models.PositiveIntegerField(default=365, help_text="Limite de dias de acesso/ano autorizados")
    data_fim_contrato = models.DateField()

    def __str__(self):
        return f"{self.usuario.username} ({self.empresa_prestadora} - {self.get_tipo_contrato_display()})"


# REGRAS OPERACIONAIS E DISPOSITIVOS
class RegraOperacionalMobile(models.Model):
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name='regras_operacionais')
    tipo_operador_alvo = models.CharField(
        max_length=20,
        choices=[(TipoOperador.FUNCIONARIO, 'Funcionário'), (TipoOperador.TERCEIRIZADO, 'Terceirizado')]
    )
    limite_edicao_manual_pct = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('20.0'),
        help_text="Percentual máximo de variação manual tolerado sem bloqueio (ex: 20%)"
    )
    tolerancia_erro_ia_pct = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('10.0'),
        help_text="Tolerância de imprecisão da IA (padrão 10%)"
    )
    exige_justificativa = models.BooleanField(default=True)
    horario_inicio = models.TimeField(null=True, blank=True)
    horario_fim = models.TimeField(null=True, blank=True)
    versao = models.PositiveIntegerField(default=1)

    class Meta:
        unique_together = ('empresa', 'tipo_operador_alvo')

    def __str__(self):
        return f"Regra {self.tipo_operador_alvo} - {self.empresa.razao_social}"


class DispositivoMovel(models.Model):
    class StatusAutorizacao(models.TextChoices):
        AUTORIZADO = 'AUTORIZADO', 'Autorizado'
        BLOQUEADO = 'BLOQUEADO', 'Bloqueado'
        PENDENTE = 'PENDENTE', 'Pendente'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name='dispositivos')
    uuid_dispositivo = models.CharField(max_length=100, unique=True)
    modelo = models.CharField(max_length=100, blank=True)
    status_autorizacao = models.CharField(
        max_length=20, choices=StatusAutorizacao.choices, default=StatusAutorizacao.AUTORIZADO
    )

    def __str__(self):
        return f"{self.modelo or 'Dispositivo'} ({self.uuid_dispositivo[:8]}...)"



# CATÁLOGO DE ATIVOS
class ClasseAtivo(models.Model):
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name='classes_ativos')
    nome_classe = models.CharField(max_length=100, help_text="Ex: Mesa Bistrô, Gradil")
    codigo_yolo = models.CharField(max_length=50, blank=True, help_text="Identificador interno para a IA")
    categoria = models.CharField(max_length=100, blank=True)
    descricao = models.TextField(blank=True, default='', verbose_name="Descrição do Ativo")
    imagem_referencia = models.ImageField(upload_to='ativos_referencia/', null=True, blank=True)

    class Meta:
        unique_together = ('empresa', 'nome_classe')

    def save(self, *args, **kwargs):
        if not self.codigo_yolo and self.nome_classe:
            from django.utils.text import slugify
            self.codigo_yolo = slugify(self.nome_classe).replace('-', '_')
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.nome_classe} ({self.empresa.razao_social})"



# INVENTÁRIO, ITENS E AUDITORIA
class Inventario(models.Model):
    class StatusAuditoria(models.TextChoices):
        APROVADO = 'APROVADO', 'Aprovado'
        REJEITADO = 'REJEITADO', 'Rejeitado'
        EM_ANALISE = 'EM_ANALISE', 'Em Análise'
        DIVERGENTE = 'DIVERGENTE', 'Divergente'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name='inventarios')
    usuario = models.ForeignKey(Usuario, on_delete=models.PROTECT, related_name='inventarios')
    dispositivo = models.ForeignKey(DispositivoMovel, on_delete=models.SET_NULL, null=True, blank=True)
    regra_operacional = models.ForeignKey(RegraOperacionalMobile, on_delete=models.SET_NULL, null=True, blank=True)
    data_hora_inicio = models.DateTimeField()
    data_hora_fim = models.DateTimeField()
    status_auditoria = models.CharField(
        max_length=30, choices=StatusAuditoria.choices, default=StatusAuditoria.EM_ANALISE
    )
    lat_long = models.CharField(max_length=100, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Inventário {str(self.id)[:8]} - {self.usuario.username} ({self.status_auditoria})"


class ItemInventario(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    inventario = models.ForeignKey(Inventario, on_delete=models.CASCADE, related_name='itens')
    classe_ativo = models.ForeignKey(ClasseAtivo, on_delete=models.PROTECT, related_name='itens_inventariados')
    qtd_detectada_ia = models.PositiveIntegerField(default=0, help_text="Contagem detectada pela IA")
    qtd_confirmada_humano = models.PositiveIntegerField(default=0, help_text="Contagem ajustada pelo operador")
    justificativa = models.TextField(blank=True, null=True, help_text="Opcional caso haja divergência")
    foto = models.ImageField(upload_to='contagens_fotos/', null=True, blank=True)
    detections_json = models.JSONField(default=list, blank=True, help_text="Bounding boxes [x, y, w, h, conf, class]")

    @property
    def divergencia_absoluta(self):
        return abs(self.qtd_confirmada_humano - self.qtd_detectada_ia)

    @property
    def divergencia_percentual(self):
        if self.qtd_detectada_ia == 0:
            return Decimal('0.0') if self.qtd_confirmada_humano == 0 else Decimal('100.0')
        return (Decimal(self.divergencia_absoluta) / Decimal(self.qtd_detectada_ia)) * Decimal('100.0')

    def __str__(self):
        return f"{self.classe_ativo.nome_classe}: IA={self.qtd_detectada_ia} | Humano={self.qtd_confirmada_humano}"


class LogAuditoria(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    inventario = models.ForeignKey(Inventario, on_delete=models.CASCADE, related_name='logs_auditoria')
    usuario_auditor = models.ForeignKey(Usuario, on_delete=models.PROTECT, related_name='auditorias_realizadas')
    parecer = models.TextField()
    data_hora = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-data_hora']

    def __str__(self):
        return f"Parecer por {self.usuario_auditor.username} em {self.data_hora:%d/%m/%Y %H:%M}"