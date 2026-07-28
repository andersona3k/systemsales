from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime
from uuid import UUID


class CofreMetaIn(BaseModel):
    salt: str
    verifier_iv: str
    verifier: str
    kdf_iters: int = 600000


class CofreMetaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    salt: str
    verifier_iv: str
    verifier: str
    kdf_iters: int


class AcessoIn(BaseModel):
    sistema: str
    url: Optional[str] = None
    usuario: Optional[str] = None
    usuario_cifrado: bool = False
    categoria_dono: Optional[str] = None
    nivel: Optional[str] = None
    tipo_acesso: Optional[str] = None
    metodo_login: Optional[str] = None
    metodo_2fa: Optional[str] = None
    email_recuperacao: Optional[str] = None
    tags: List[str] = []
    icone_biometria: bool = False
    segredo_iv: Optional[str] = None
    segredo: Optional[str] = None


class AcessoUpdate(BaseModel):
    sistema: Optional[str] = None
    url: Optional[str] = None
    usuario: Optional[str] = None
    usuario_cifrado: Optional[bool] = None
    categoria_dono: Optional[str] = None
    nivel: Optional[str] = None
    tipo_acesso: Optional[str] = None
    metodo_login: Optional[str] = None
    metodo_2fa: Optional[str] = None
    email_recuperacao: Optional[str] = None
    tags: Optional[List[str]] = None
    icone_biometria: Optional[bool] = None
    segredo_iv: Optional[str] = None
    segredo: Optional[str] = None


class AcessoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    sistema: str
    url: Optional[str] = None
    usuario: Optional[str] = None
    usuario_cifrado: bool
    categoria_dono: Optional[str] = None
    nivel: Optional[str] = None
    tipo_acesso: Optional[str] = None
    metodo_login: Optional[str] = None
    metodo_2fa: Optional[str] = None
    email_recuperacao: Optional[str] = None
    tags: List[str] = []
    icone_biometria: bool
    segredo_iv: Optional[str] = None
    segredo: Optional[str] = None
    criado_em: datetime
    atualizado_em: datetime
