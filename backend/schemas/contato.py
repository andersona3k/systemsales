from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Any


class ContatoBase(BaseModel):
    nome: str
    empresa_id: UUID | None = None
    cargo: str | None = None
    responsavel: str | None = None
    telefone1: str | None = None
    telefone2: str | None = None
    whatsapp: str | None = None
    email: str | None = None
    website: str | None = None
    linkedin: str | None = None
    instagram: str | None = None
    endereco: str | None = None
    cidade: str | None = None
    estado: str | None = None
    regional: str | None = None
    aniversario: str | None = None
    origem: str = "cartao_fisico"
    tipos: list[str] = []
    status: str = "sem_info"
    notas: str | None = None
    campos_extras: dict[str, Any] = {}
    categoria_id: UUID | None = None


class ContatoCreate(ContatoBase):
    pass


class ContatoUpdate(BaseModel):
    nome: str | None = None
    empresa_id: UUID | None = None
    cargo: str | None = None
    responsavel: str | None = None
    telefone1: str | None = None
    telefone2: str | None = None
    whatsapp: str | None = None
    email: str | None = None
    website: str | None = None
    linkedin: str | None = None
    instagram: str | None = None
    endereco: str | None = None
    cidade: str | None = None
    estado: str | None = None
    regional: str | None = None
    aniversario: str | None = None
    origem: str | None = None
    tipos: list[str] | None = None
    status: str | None = None
    notas: str | None = None
    campos_extras: dict[str, Any] | None = None
    categoria_id: UUID | None = None


class ContatoListOut(BaseModel):
    id: UUID
    nome: str
    cargo: str | None = None
    responsavel: str | None = None
    telefone1: str | None = None
    whatsapp: str | None = None
    email: str | None = None
    empresa_id: UUID | None = None
    empresa_nome: str | None = None
    empresa_cnpj: str | None = None
    categoria_id: UUID | None = None
    origem: str
    tipos: list[str] = []
    status: str = "sem_info"
    cidade: str | None = None
    estado: str | None = None
    regional: str | None = None
    aniversario: str | None = None
    foto_frente: str | None = None
    foto_perfil: str | None = None
    criado_em: datetime

    class Config:
        from_attributes = True


class ContatoOut(ContatoBase):
    id: UUID
    foto_frente: str | None = None
    foto_verso: str | None = None
    foto_perfil: str | None = None
    empresa_nome: str | None = None
    criado_em: datetime
    atualizado_em: datetime

    class Config:
        from_attributes = True
