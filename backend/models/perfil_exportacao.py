import uuid
from sqlalchemy import Column, String
from sqlalchemy.dialects.postgresql import UUID, JSONB
from ..database import Base


class PerfilExportacao(Base):
    __tablename__ = "perfis_exportacao"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nome = Column(String(100), nullable=False)
    formato = Column(String(10), nullable=False, default="csv")
    campos = Column(JSONB, default=[])
    mapeamento = Column(JSONB, default={})
    filtros = Column(JSONB, default={})
