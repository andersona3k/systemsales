from pydantic import BaseModel, ConfigDict
from uuid import UUID


class RedeIn(BaseModel):
    nome: str
    icone: str = 'linkedin'
    canal: str
    modulo: str = 'publicacoes'
    ordem: int = 0
    ativo: bool = True


class RedeUpdate(BaseModel):
    nome: str | None = None
    icone: str | None = None
    canal: str | None = None
    modulo: str | None = None
    ordem: int | None = None
    ativo: bool | None = None


class RedeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    nome: str
    icone: str
    canal: str
    modulo: str
    ordem: int
    ativo: bool
