import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from ..database import Base


class Empresa(Base):
    __tablename__ = "empresas"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nome = Column(String(200), nullable=False)
    razao_social = Column(String(200), nullable=True)
    cnpj = Column(String(18), nullable=True)
    status = Column(String(40), nullable=True)
    situacao = Column(String(40), nullable=True)
    responsavel = Column(String(120), nullable=True)
    data_ultimo_contato = Column(String(10), nullable=True)
    segmento = Column(String(60), nullable=True)
    cidade = Column(String(120), nullable=True)
    website = Column(String(255), nullable=True)
    telefone = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    endereco = Column(Text, nullable=True)
    notas = Column(Text, nullable=True)
    campos_extras = Column(JSONB, default={})
    categoria_id = Column(UUID(as_uuid=True), ForeignKey("categorias.id"), nullable=True)
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    categoria = relationship("Categoria", back_populates="empresas")
    contatos = relationship("Contato", back_populates="empresa")
