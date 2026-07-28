from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Any


class UsuarioCreate(BaseModel):
    nome: str
    username: str
    senha: str
    role: str = "comercial"
    permissoes: dict[str, Any] = {}


class UsuarioUpdate(BaseModel):
    nome: str | None = None
    role: str | None = None
    permissoes: dict[str, Any] | None = None
    ativo: bool | None = None


class UsuarioOut(BaseModel):
    id: UUID
    nome: str
    username: str
    role: str
    permissoes: dict[str, Any] = {}
    ativo: bool
    must_change: bool
    criado_em: datetime

    class Config:
        from_attributes = True


class TrocarSenha(BaseModel):
    senha_atual: str
    senha_nova: str
