from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class LinkCreate(BaseModel):
    categoria: str | None = None
    grupo: str | None = None
    nome: str | None = None
    website: str | None = None


class LinkOut(BaseModel):
    id: UUID
    categoria: str | None = None
    grupo: str | None = None
    nome: str | None = None
    website: str | None = None
    criado_em: datetime

    class Config:
        from_attributes = True
