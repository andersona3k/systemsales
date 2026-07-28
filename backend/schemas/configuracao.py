from pydantic import BaseModel
from uuid import UUID
from typing import Any


class ConfiguracaoUpsert(BaseModel):
    chave: str
    valor: Any


class ConfiguracaoOut(BaseModel):
    id: UUID
    chave: str
    valor: Any

    class Config:
        from_attributes = True
