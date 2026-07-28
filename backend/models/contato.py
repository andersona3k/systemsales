import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from ..database import Base
import enum


class OrigemContato(str, enum.Enum):
    cartao_fisico = "cartao_fisico"
    manual = "manual"
    feira_evento = "feira_evento"
    indicacao = "indicacao"
    google = "google"
    outlook = "outlook"
    outro = "outro"


class Contato(Base):
    __tablename__ = "contatos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nome = Column(String(200), nullable=False)
    empresa_id = Column(UUID(as_uuid=True), ForeignKey("empresas.id"), nullable=True)
    cargo = Column(String(150), nullable=True)
    responsavel = Column(String(120), nullable=True)
    telefone1 = Column(String(20), nullable=True)
    telefone2 = Column(String(20), nullable=True)
    whatsapp = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    website = Column(String(255), nullable=True)
    linkedin = Column(String(255), nullable=True)
    instagram = Column(String(100), nullable=True)
    endereco = Column(Text, nullable=True)
    cidade = Column(String(120), nullable=True)
    estado = Column(String(60), nullable=True)
    regional = Column(String(60), nullable=True)
    aniversario = Column(String(10), nullable=True)
    origem = Column(String(50), default="cartao_fisico")
    tipos = Column(JSONB, default=list)
    status = Column(String(20), default="sem_info")
    notas = Column(Text, nullable=True)
    foto_frente = Column(String(500), nullable=True)
    foto_verso = Column(String(500), nullable=True)
    foto_perfil = Column(String(500), nullable=True)
    campos_extras = Column(JSONB, default={})
    categoria_id = Column(UUID(as_uuid=True), ForeignKey("categorias.id"), nullable=True)
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    empresa = relationship("Empresa", back_populates="contatos")
    categoria = relationship("Categoria", back_populates="contatos")
