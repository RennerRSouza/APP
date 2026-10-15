from django import forms
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from .models import (
    Empresa, Usuario, ClasseAtivo, RegraOperacionalMobile,
    Funcionario, Terceirizado, TipoOperador
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
        fields = ['nome_classe', 'categoria', 'descricao', 'imagem_referencia']
        labels = {
            'nome_classe': 'Nome do Ativo',
            'categoria': 'Categoria',
            'descricao': 'Descrição do Ativo (Opcional)',
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