from pydantic import BaseModel
from uuid import UUID
from ..models.campo_customizado import TipoCampo, EntidadeCampo


class CampoCustomizadoBase(BaseModel):
    nome: str
    chave: str
    tipo: TipoCampo = TipoCampo.texto
    opcoes: list[str] = []
    entidade: EntidadeCampo = EntidadeCampo.contato
    obrigatorio: bool = False
    ordem: int = 0
    ativo: bool = True


class CampoCustomizadoCreate(CampoCustomizadoBase):
    pass


class CampoCustomizadoUpdate(BaseModel):
    nome: str | None = None
    tipo: TipoCampo | None = None
    opcoes: list[str] | None = None
    entidade: EntidadeCampo | None = None
    obrigatorio: bool | None = None
    ordem: int | None = None
    ativo: bool | None = None


class CampoCustomizadoOut(CampoCustomizadoBase):
    id: UUID

    class Config:
        from_attributes = True
