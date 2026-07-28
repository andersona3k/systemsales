import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Integer, Boolean, text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from ..database import Base


class Publicacao(Base):
    __tablename__ = "publicacoes"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    numero = Column(Integer, server_default=text("nextval('pub_numero_seq')"))
    categoria = Column(String(80), nullable=True)
    tema = Column(Text, nullable=True)
    post = Column(Text, nullable=True)
    hashtags = Column(Text, nullable=True)
    data = Column(String(10), nullable=True)
    planejador = Column(String(40), nullable=True)
    canal = Column(String(20), default='linkedin', server_default=text("'linkedin'"))
    imagens = Column(JSONB, default=list)
    origem_cerveja_id = Column(UUID(as_uuid=True), nullable=True)
    arquivado = Column(Boolean, default=False, server_default=text("false"))
    excluido = Column(Boolean, default=False, server_default=text("false"))
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
