from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.core.database import get_db
from src.core.security import require_api_key
from src.models.contagem import Contagem
from src.schemas.contagem import ContagemIn, ContagemOut

router = APIRouter(prefix="/v1/contagens", tags=["contagens"], dependencies=[Depends(require_api_key)])


@router.put("/{contagem_id}", response_model=ContagemOut)
def upsert(contagem_id: str, body: ContagemIn, db: Session = Depends(get_db)) -> Contagem:
    obj = db.get(Contagem, contagem_id)
    if obj is None:
        obj = Contagem(id=contagem_id, **body.model_dump())
        db.add(obj)
    else:
        for k, v in body.model_dump().items():
            setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("", response_model=list[ContagemOut])
def listar(limit: int = 50, db: Session = Depends(get_db)) -> list[Contagem]:
    stmt = select(Contagem).order_by(Contagem.criado_em.desc()).limit(min(limit, 200))
    return list(db.scalars(stmt))
