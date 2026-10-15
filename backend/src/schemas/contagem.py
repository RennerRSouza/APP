from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ContagemIn(BaseModel):
    total_detectado: int = Field(ge=0)
    total_confirmado: int = Field(ge=0)
    por_classe: dict[str, int] = {}
    modelo_versao: str = Field(max_length=32)
    criado_em: datetime


class ContagemOut(ContagemIn):
    model_config = ConfigDict(from_attributes=True)
    id: str
    recebido_em: datetime
