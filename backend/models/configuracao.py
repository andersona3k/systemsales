import uuid
from sqlalchemy import Column, String
from sqlalchemy.dialects.postgresql import UUID, JSONB
from ..database import Base


class Configuracao(Base):
    __tablename__ = "configuracoes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chave = Column(String(100), nullable=False, unique=True)
    valor = Column(JSONB, default={})
