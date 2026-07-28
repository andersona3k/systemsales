import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from ..database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nome = Column(String(120), nullable=False)
    username = Column(String(80), unique=True, nullable=False)
    senha_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="comercial")
    permissoes = Column(JSONB, default=dict)
    ativo = Column(Boolean, default=True)
    must_change = Column(Boolean, default=False)
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
