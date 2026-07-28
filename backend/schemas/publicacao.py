from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class PublicacaoCreate(BaseModel):
    categoria: str | None = None
    tema: str | None = None
    post: str | None = None
    hashtags: str | None = None
    data: str | None = None
    planejador: str | None = None
    canal: str = 'linkedin'
    imagens: list[str] = []
    origem_cerveja_id: str | None = None


class PublicacaoOut(BaseModel):
    id: UUID
    numero: int | None = None
    categoria: str | None = None
    tema: str | None = None
    post: str | None = None
    hashtags: str | None = None
    data: str | None = None
    planejador: str | None = None
    imagens: list[str] = []
    arquivado: bool = False
    excluido: bool = False
    canal: str = 'linkedin'
    origem_cerveja_id: UUID | None = None
    criado_em: datetime

    class Config:
        from_attributes = True
