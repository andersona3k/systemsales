from pydantic import BaseModel
from uuid import UUID
from typing import Any


class PerfilExportacaoBase(BaseModel):
    nome: str
    formato: str = "csv"
    campos: list[str] = []
    mapeamento: dict[str, str] = {}
    filtros: dict[str, Any] = {}


class PerfilExportacaoCreate(PerfilExportacaoBase):
    pass


class PerfilExportacaoUpdate(BaseModel):
    nome: str | None = None
    formato: str | None = None
    campos: list[str] | None = None
    mapeamento: dict[str, str] | None = None
    filtros: dict[str, Any] | None = None


class PerfilExportacaoOut(PerfilExportacaoBase):
    id: UUID

    class Config:
        from_attributes = True
