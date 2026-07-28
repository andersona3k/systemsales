import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Integer, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from ..database import Base


class CofreMeta(Base):
    """Metadados por usuário p/ destravar o cofre. NÃO guarda a senha-mestre."""
    __tablename__ = "cofre_meta"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(150), unique=True, nullable=False, index=True)
    salt = Column(String(64), nullable=False)          # base64 do salt (PBKDF2)
    verifier_iv = Column(String(32), nullable=False)   # base64 do IV do verifier
    verifier = Column(Text, nullable=False)            # base64 do ciphertext do verifier
    kdf_iters = Column(Integer, nullable=False, default=600000)
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Acesso(Base):
    """Uma credencial. Campos pesquisáveis em texto puro; segredos em blobs cifrados."""
    __tablename__ = "cofre_acessos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(150), nullable=False, index=True)
    # texto puro (não sensível, pesquisável)
    sistema = Column(String(200), nullable=False)
    url = Column(String(500), nullable=True)
    usuario = Column(String(300), nullable=True)
    usuario_cifrado = Column(Boolean, default=False)
    categoria_dono = Column(String(40), nullable=True)
    nivel = Column(String(20), nullable=True)
    tipo_acesso = Column(String(20), nullable=True)
    metodo_login = Column(String(30), nullable=True)
    metodo_2fa = Column(String(20), nullable=True)
    email_recuperacao = Column(String(300), nullable=True)
    tags = Column(JSONB, default=list)
    icone_biometria = Column(Boolean, default=False)
    # blobs cifrados (zero-knowledge — servidor nunca decifra)
    segredo_iv = Column(Text, nullable=True)
    segredo = Column(Text, nullable=True)
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow)
