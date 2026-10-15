from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from src.core.database import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Contagem(Base):
    __tablename__ = "contagens"

    # ID gerado no aparelho: torna o envio idempotente (retry seguro).
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    total_detectado: Mapped[int] = mapped_column(Integer)
    total_confirmado: Mapped[int] = mapped_column(Integer)
    por_classe: Mapped[dict] = mapped_column(JSON, default=dict)
    modelo_versao: Mapped[str] = mapped_column(String(32))
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    recebido_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
