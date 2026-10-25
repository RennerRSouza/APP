from datetime import date, timedelta
from django import forms
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from .models import (
    Empresa, Usuario, ClasseAtivo, RegraOperacionalMobile,
    Funcionario, Terceirizado, TipoOperador,
    ParametrosLocacao, SolicitacaoInteresse, NotificacaoInterna
)

# ==============================================================================
# ONBOARDING (EMPRESA + GESTOR)
# ==============================================================================
class CadastroEmpresaForm(forms.Form):
    razao_social = forms.CharField(max_length=255, label="Razão social")
    subdominio = forms.SlugField(
        max_length=63,
        label="Identificador (subdomínio)",
        help_text="Apenas letras minúsculas, números e hífen. Ex: prime-eventos",
    )
    first_name = forms.CharField(max_length=150, label="Nome")
    last_name = forms.CharField(max_length=150, label="Sobrenome")
    email = forms.EmailField(label="E-mail")
    username = forms.CharField(max_length=150, label="Usuário de acesso")
    password1 = forms.CharField(widget=forms.PasswordInput, label="Senha")
    password2 = forms.CharField(widget=forms.PasswordInput, label="Confirmar senha")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field in self.fields.values():
            field.widget.attrs.setdefault('class', 'form-control')

    def clean_subdominio(self):
        sub = self.cleaned_data['subdominio'].lower()
        schema = sub.replace('-', '_')
        if Empresa.objects.filter(subdominio=sub).exists() or Empresa.objects.filter(schema_name=schema).exists():
            raise ValidationError("Este identificador já está em uso.")
        return sub

    def clean_username(self):
        username = self.cleaned_data['username']
        if Usuario.objects.filter(username__iexact=username).exists():
            raise ValidationError("Este nome de usuário já existe.")
        return username

    def clean(self):
        cleaned = super().clean()
        p1, p2 = cleaned.get('password1'), cleaned.get('password2')
        if p1 and p2 and p1 != p2:
            self.add_error('password2', "As senhas não conferem.")
        elif p1:
            try:
                validate_password(p1, user=Usuario(
                    username=cleaned.get('username', ''),
                    email=cleaned.get('email', ''),
                    first_name=cleaned.get('first_name', ''),
                    last_name=cleaned.get('last_name', ''),
                ))
            except ValidationError as e:
                self.add_error('password1', e)
        return cleaned


# ==============================================================================
# CATÁLOGO DE ATIVOS (UC03)
# ==============================================================================
class ClasseAtivoForm(forms.ModelForm):
    class Meta:
        model = ClasseAtivo
        fields = [
            'nome_classe', 'categoria', 'descricao',
            'limite_minimo_itens', 'limite_maximo_itens', 'imagem_referencia'
        ]
        labels = {
            'nome_classe': 'Nome do Ativo',
            'categoria': 'Categoria',
            'descricao': 'Descrição do Ativo (Opcional)',
            'limite_minimo_itens': 'Qtd. Mínima por Solicitação',
            'limite_maximo_itens': 'Qtd. Máxima por Solicitação',
            'imagem_referencia': 'Foto de Referência (Opcional)',
        }
        widgets = {
            'descricao': forms.Textarea(attrs={'rows': 3, 'placeholder': 'Detalhes, dimensões ou observações sobre o ativo...'}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field in self.fields.values():
            field.widget.attrs.setdefault('class', 'form-control')


# ==============================================================================
# REGRAS OPERACIONAIS MOBILE (UC02 / UML RegraOperacionalForm)
# ==============================================================================
class RegraOperacionalForm(forms.ModelForm):
    class Meta:
        model = RegraOperacionalMobile
        fields = [
            'tolerancia_erro_ia_pct',
            'limite_edicao_manual_pct',
            'exige_justificativa',
            'horario_inicio',
            'horario_fim',
        ]
        labels = {
            'tolerancia_erro_ia_pct': 'Tolerância de Erro da IA (%)',
            'limite_edicao_manual_pct': 'Limite Máximo de Edição Manual (%)',
            'exige_justificativa': 'Exigir Justificativa em Divergências',
            'horario_inicio': 'Horário Inicial Permitido',
            'horario_fim': 'Horário Limite',
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for name, field in self.fields.items():
            if not isinstance(field.widget, forms.CheckboxInput):
                field.widget.attrs.setdefault('class', 'form-control')
            else:
                field.widget.attrs.setdefault('class', 'form-check-input')


# ==============================================================================
# GESTÃO DE USUÁRIOS E EQUIPE (UC01)
# ==============================================================================
class UsuarioCreateForm(forms.Form):
    first_name = forms.CharField(max_length=150, label="Nome")
    last_name = forms.CharField(max_length=150, label="Sobrenome")
    username = forms.CharField(max_length=150, label="Nome de Usuário")
    email = forms.EmailField(label="E-mail")
    password = forms.CharField(widget=forms.PasswordInput, label="Senha Inicial")
    tipo_operador = forms.ChoiceField(
        choices=[
            (TipoOperador.FUNCIONARIO, 'Funcionário'),
            (TipoOperador.TERCEIRIZADO, 'Terceirizado'),
            (TipoOperador.GESTOR, 'Gestor / Administrador'),
        ],
        label="Tipo de Operador / Perfil"
    )

    # Campos específicos para Funcionário
    matricula = forms.CharField(max_length=50, required=False, label="Matrícula")
    departamento = forms.CharField(max_length=100, required=False, label="Departamento")

    # Campos específicos para Terceirizado
    empresa_prestadora = forms.CharField(max_length=150, required=False, label="Empresa Prestadora")
    tipo_contrato = forms.ChoiceField(
        choices=Terceirizado.TipoContrato.choices,
        required=False,
        label="Tipo de Contrato"
    )
    dias_acesso_ano = forms.IntegerField(
        required=False,
        initial=365,
        label="Limite de Dias de Acesso / Ano"
    )
    data_fim_contrato = forms.DateField(
        widget=forms.DateInput(attrs={'type': 'date'}),
        required=False,
        label="Data Fim do Contrato"
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field in self.fields.values():
            field.widget.attrs.setdefault('class', 'form-control')

    def clean_username(self):
        u = self.cleaned_data['username']
        if Usuario.objects.filter(username__iexact=u).exists():
            raise ValidationError("Este nome de usuário já está em uso.")
        return u

# ==============================================================================
# PILAR 1: VITRINE PARAMETRIZADA & MANIFESTAÇÃO DE INTERESSE (RFQ)
# ==============================================================================
class ParametrosLocacaoForm(forms.ModelForm):
    class Meta:
        model = ParametrosLocacao
        fields = ['regiao', 'dias_antecedencia_min', 'prazo_frete_dias_uteis', 'disclaimer_legal']
        labels = {
            'regiao': 'Cidade e Região de Atendimento',
            'dias_antecedencia_min': 'Antecedência Mínima para Reserva (Dias)',
            'prazo_frete_dias_uteis': 'Prazo Estimado de Logística/Frete (Dias Úteis)',
            'disclaimer_legal': 'Termo / Disclaimer Legal do Portal Público',
        }
        widgets = {
            'disclaimer_legal': forms.Textarea(attrs={'rows': 3}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field in self.fields.values():
            field.widget.attrs.setdefault('class', 'form-control')


class SolicitacaoInteresseForm(forms.ModelForm):
    class Meta:
        model = SolicitacaoInteresse
        fields = [
            'nome_solicitante', 'documento', 'telefone_whatsapp', 'email_solicitante',
            'cep_evento', 'endereco_evento', 'localizacao',
            'data_inicio_evento', 'data_fim_evento', 'observacoes_cliente'
        ]
        widgets = {
            'data_inicio_evento': forms.DateInput(attrs={'type': 'date'}),
            'data_fim_evento': forms.DateInput(attrs={'type': 'date'}),
            'localizacao': forms.TextInput(attrs={'placeholder': 'link do Google Maps e ponto de referência'}),
            'observacoes_cliente': forms.Textarea(attrs={'rows': 3, 'placeholder': 'Horário desejado de montagem, restrições de acesso ao local, etc.'}),
        }

    def __init__(self, *args, empresa=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.empresa = empresa
        for field in self.fields.values():
            field.widget.attrs.setdefault('class', 'form-control')

    def clean(self):
        cleaned = super().clean()
        dt_inicio = cleaned.get('data_inicio_evento')
        dt_fim = cleaned.get('data_fim_evento')

        if dt_inicio and dt_fim:
            if dt_fim < dt_inicio:
                self.add_error('data_fim_evento', "A data de término não pode ser anterior à data de início.")

            # Regra de Negócio: Validação de antecedência mínima configurada pela locadora
            dias_min = 3
            if self.empresa and hasattr(self.empresa, 'parametros_locacao'):
                dias_min = self.empresa.parametros_locacao.dias_antecedencia_min

            data_minima = date.today() + timedelta(days=dias_min)
            if dt_inicio < data_minima:
                self.add_error(
                    'data_inicio_evento',
                    f"Esta locadora exige antecedência mínima de {dias_min} dia(s) para análise logística (a partir de {data_minima:%d/%m/%Y})."
                )
        return cleaned


# ==============================================================================
# PILAR 2: COMUNICADOS E NOTIFICAÇÕES INTERNAS (NETWORKING)
# ==============================================================================
class NotificacaoInternaForm(forms.ModelForm):
    class Meta:
        model = NotificacaoInterna
        fields = ['destinatario', 'tipo', 'titulo', 'mensagem']
        labels = {
            'destinatario': 'Destinatário (Vazio = Mural Geral da Equipe)',
            'tipo': 'Categoria do Aviso',
            'titulo': 'Título do Comunicado / Tarefa',
            'mensagem': 'Conteúdo da Mensagem',
        }
        widgets = {
            'mensagem': forms.Textarea(attrs={'rows': 3}),
        }

    def __init__(self, *args, empresa=None, **kwargs):
        super().__init__(*args, **kwargs)
        if empresa:
            self.fields['destinatario'].queryset = Usuario.objects.filter(empresa=empresa, status_ativo=True)
        for field in self.fields.values():
            field.widget.attrs.setdefault('class', 'form-control')