from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class CervejaCreate(BaseModel):
    numero: int | None = None
    cerveja: str | None = None
    classe: str | None = None
    estilo: str | None = None
    embalagem: str | None = None
    fabricacao: str | None = None
    fabricante: str | None = None
    cidade: str | None = None
    estado: str | None = None
    pais: str | None = None
    onde_bebi: str | None = None
    nota: int | None = None
    comentario_interno: str | None = None
    legenda: str | None = None
    status: str | None = None
    observacao: str | None = None
    story: bool = False
    whatsapp: bool = False


class CervejaOut(BaseModel):
    id: UUID
    numero: int | None = None
    cerveja: str | None = None
    classe: str | None = None
    estilo: str | None = None
    embalagem: str | None = None
    fabricacao: str | None = None
    fabricante: str | None = None
    cidade: str | None = None
    estado: str | None = None
    pais: str | None = None
    onde_bebi: str | None = None
    nota: int | None = None
    comentario_interno: str | None = None
    legenda: str | None = None
    status: str | None = None
    observacao: str | None = None
    story: bool = False
    whatsapp: bool = False
    imagens: list[str] = []
    arquivado: bool = False
    criado_em: datetime

    class Config:
        from_attributes = True
