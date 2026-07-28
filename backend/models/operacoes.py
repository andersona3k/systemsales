import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Date, Float, Boolean, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from ..database import Base


class PrecificacaoEvento(Base):
    __tablename__ = "op_precificacao_eventos"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    data = Column(Date)
    cliente = Column(String(200))
    oportunidade = Column(String(200))
    dr = Column(String(100))
    pc = Column(String(100))
    goevo = Column(String(100))
    descricao = Column(Text)
    ptax_valor = Column(Float)
    ptax_data = Column(Date)
    transformar_reais = Column(Boolean, default=False, server_default=text("false"))
    margem_padrao = Column(Float, default=20, server_default=text("20"))
    moeda = Column(String(3), default="usd", server_default=text("'usd'"))
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    produtos = relationship("PrecificacaoProduto", backref="evento", cascade="all, delete-orphan", order_by="PrecificacaoProduto.criado_em")


class PrecificacaoProduto(Base):
    __tablename__ = "op_precificacao_produtos"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    evento_id = Column(UUID(as_uuid=True), ForeignKey("op_precificacao_eventos.id", ondelete="CASCADE"), nullable=False)
    pn = Column(String(120))
    descricao = Column(Text)
    custo = Column(Float, default=0)
    margem_pct = Column(Float)  # null = herda margem_padrao do evento
    foto_url = Column(String(300))
    criado_em = Column(DateTime, default=datetime.utcnow)
