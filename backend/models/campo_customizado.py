import uuid
from sqlalchemy import Column, String, Boolean, Integer, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from ..database import Base
import enum


class TipoCampo(str, enum.Enum):
    texto = "texto"
    numero = "numero"
    email = "email"
    telefone = "telefone"
    cpf = "cpf"
    cnpj = "cnpj"
    data = "data"
    url = "url"
    multipla_escolha = "multipla_escolha"
    escolha_unica = "escolha_unica"
    booleano = "booleano"
    notas_longas = "notas_longas"


class EntidadeCampo(str, enum.Enum):
    empresa = "empresa"
    contato = "contato"
    ambos = "ambos"


class CampoCustomizado(Base):
    __tablename__ = "campos_customizados"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nome = Column(String(100), nullable=False)
    chave = Column(String(100), nullable=False, unique=True)
    tipo = Column(SAEnum(TipoCampo), nullable=False, default=TipoCampo.texto)
    opcoes = Column(JSONB, default=[])
    entidade = Column(SAEnum(EntidadeCampo), nullable=False, default=EntidadeCampo.contato)
    obrigatorio = Column(Boolean, default=False)
    ordem = Column(Integer, default=0)
    ativo = Column(Boolean, default=True)
