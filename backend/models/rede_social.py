import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, DateTime, text
from sqlalchemy.dialects.postgresql import UUID
from ..database import Base


class RedeSocial(Base):
    __tablename__ = "redes_sociais"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nome = Column(String(120), nullable=False)
    icone = Column(String(20), nullable=False, default='linkedin')   # linkedin|instagram|whatsapp
    canal = Column(String(40), nullable=False)                       # chave usada em publicacoes (ou 'bebidas')
    modulo = Column(String(20), nullable=False, default='publicacoes', server_default=text("'publicacoes'"))  # publicacoes|bebidas
    ordem = Column(Integer, default=0)
    ativo = Column(Boolean, default=True, server_default=text("true"))
    criado_em = Column(DateTime, default=datetime.utcnow)
