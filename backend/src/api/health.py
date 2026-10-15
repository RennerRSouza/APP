from fastapi import APIRouter

router = APIRouter(tags=["infra"])


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
