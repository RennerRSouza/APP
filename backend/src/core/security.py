import secrets

from fastapi import Depends, HTTPException, status
from fastapi.security import APIKeyHeader

from src.core.config import settings

_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def require_api_key(key: str | None = Depends(_header)) -> None:
    if not key or not secrets.compare_digest(key, settings.api_key):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "API key inválida")
