import uuid
from sqlalchemy import Column, String, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from ..database import Base
import enum


class TipoCategoria(str, enum.Enum):
    empresa = "empresa"
    contato = "contato"
    ambos = "ambos"


class Categoria(Base):
    __tablename__ = "categorias"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nome = Column(String(100), nullable=False)
    tipo = Column(SAEnum(TipoCategoria), nullable=False, default=TipoCategoria.ambos)
    cor = Column(String(7), default="#6366f1")

    empresas = relationship("Empresa", back_populates="categoria")
    contatos = relationship("Contato", back_populates="categoria")
