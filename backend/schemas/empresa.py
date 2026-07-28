from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Any


class EmpresaBase(BaseModel):
    nome: str
    razao_social: str | None = None
    cnpj: str | None = None
    status: str | None = None
    situacao: str | None = None
    responsavel: str | None = None
    data_ultimo_contato: str | None = None
    segmento: str | None = None
    cidade: str | None = None
    website: str | None = None
    telefone: str | None = None
    email: str | None = None
    endereco: str | None = None
    notas: str | None = None
    campos_extras: dict[str, Any] = {}
    categoria_id: UUID | None = None


class EmpresaCreate(EmpresaBase):
    pass


class EmpresaUpdate(BaseModel):
    nome: str | None = None
    razao_social: str | None = None
    cnpj: str | None = None
    status: str | None = None
    situacao: str | None = None
    responsavel: str | None = None
    data_ultimo_contato: str | None = None
    segmento: str | None = None
    cidade: str | None = None
    website: str | None = None
    telefone: str | None = None
    email: str | None = None
    endereco: str | None = None
    notas: str | None = None
    campos_extras: dict[str, Any] | None = None
    categoria_id: UUID | None = None


class EmpresaListOut(BaseModel):
    id: UUID
    nome: str
    razao_social: str | None = None
    cnpj: str | None = None
    status: str | None = None
    situacao: str | None = None
    responsavel: str | None = None
    data_ultimo_contato: str | None = None
    segmento: str | None = None
    cidade: str | None = None
    num_contatos: int = 0
    categoria_id: UUID | None = None
    criado_em: datetime

    class Config:
        from_attributes = True


class EmpresaOut(EmpresaBase):
    id: UUID
    criado_em: datetime
    atualizado_em: datetime

    class Config:
        from_attributes = True
