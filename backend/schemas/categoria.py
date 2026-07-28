from pydantic import BaseModel
from uuid import UUID
from ..models.categoria import TipoCategoria


class CategoriaBase(BaseModel):
    nome: str
    tipo: TipoCategoria = TipoCategoria.ambos
    cor: str = "#6366f1"


class CategoriaCreate(CategoriaBase):
    pass


class CategoriaUpdate(BaseModel):
    nome: str | None = None
    tipo: TipoCategoria | None = None
    cor: str | None = None


class CategoriaOut(CategoriaBase):
    id: UUID

    class Config:
        from_attributes = True
