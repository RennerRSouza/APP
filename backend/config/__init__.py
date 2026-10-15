"""
Inicialização do projeto SIGA.
Garante compatibilidade para renderização do Django Admin no Python 3.14+.
"""
import sys

# Patch de compatibilidade para Python 3.14+ (mudança no copy(super()))
if sys.version_info >= (3, 14):
    import django.template.context as _ctx

    def _safe_basecontext_copy(self):
        obj = object.__new__(self.__class__)
        obj.__dict__.update(self.__dict__)
        obj.dicts = self.dicts[:]
        return obj

    _ctx.BaseContext.__copy__ = _safe_basecontext_copy