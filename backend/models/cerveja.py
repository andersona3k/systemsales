import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Integer, Boolean, text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from ..database import Base


class Cerveja(Base):
    __tablename__ = "cervejas"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    numero = Column(Integer, server_default=text("nextval('cerveja_numero_seq')"))
    cerveja = Column(String(200), nullable=True)
    classe = Column(String(100), nullable=True)
    estilo = Column(String(100), nullable=True)
    embalagem = Column(String(100), nullable=True)
    fabricacao = Column(String(100), nullable=True)
    fabricante = Column(String(200), nullable=True)
    cidade = Column(String(120), nullable=True)
    estado = Column(String(60), nullable=True)
    pais = Column(String(80), nullable=True)
    onde_bebi = Column(String(200), nullable=True)
    nota = Column(Integer, nullable=True)
    comentario_interno = Column(Text, nullable=True)
    legenda = Column(Text, nullable=True)
    status = Column(String(60), nullable=True)
    observacao = Column(Text, nullable=True)
    story = Column(Boolean, default=False, server_default=text("false"))
    whatsapp = Column(Boolean, default=False, server_default=text("false"))
    imagens = Column(JSONB, default=list)
    arquivado = Column(Boolean, default=False, server_default=text("false"))
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
