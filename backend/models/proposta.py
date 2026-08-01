import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Integer, Float, Boolean, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from ..database import Base


class PropTemplate(Base):
    """Modelo/template de proposta. 'config' guarda os booleanos (toggles de bloco) por modelo."""
    __tablename__ = "prop_templates"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tipo = Column(String(20), nullable=False)  # venda | locacao
    nome = Column(String(200), nullable=False)
    versao = Column(Integer, default=1)
    ativo = Column(Boolean, default=True, server_default=text("true"))
    config = Column(JSONB, default=dict)  # {blocos:[{chave,label,ligado}], grupos_categorias:[...], secoes:[...]}
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class PropProduto(Base):
    """Catálogo de produtos próprio do módulo Proposta Comercial."""
    __tablename__ = "prop_produtos"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nome = Column(String(200), nullable=False)
    codigo = Column(String(80))
    categoria = Column(String(40))  # equipamentos|servicos|software|software_customizacao|software_integracao|produtos
    moeda = Column(String(8), default="BRL")
    valor_unitario = Column(Float, default=0)
    info_padrao = Column(Text)
    ativo = Column(Boolean, default=True, server_default=text("true"))
    criado_em = Column(DateTime, default=datetime.utcnow)


class PropContentBlock(Base):
    """Biblioteca de blocos de cláusula/condição (fonte única). conteudo_padrao = doc Tiptap (JSON)."""
    __tablename__ = "prop_content_blocks"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chave = Column(String(60), nullable=False)
    titulo = Column(String(200))
    aplica_se_a = Column(String(20), default="ambos")  # venda | locacao | ambos
    conteudo_padrao = Column(JSONB, default=dict)
    versao = Column(Integer, default=1)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class PropProposta(Base):
    __tablename__ = "prop_propostas"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tipo = Column(String(20), nullable=False)  # venda | locacao
    status = Column(String(20), default="rascunho", server_default=text("'rascunho'"))  # rascunho|pronta|enviada|aceita|expirada
    template_id = Column(UUID(as_uuid=True), ForeignKey("prop_templates.id"))
    empresa_id = Column(UUID(as_uuid=True), ForeignKey("prosp_empresas.id"))  # cliente (Prospecção)
    pessoa_id = Column(UUID(as_uuid=True), ForeignKey("prosp_pessoas.id"))    # contato (Prospecção)
    data = Column(String(10))
    validade_dias = Column(Integer)
    texto_comercial = Column(JSONB, default=dict)  # doc Tiptap
    moeda_padrao = Column(String(8), default="BRL")
    blocos = Column(JSONB, default=dict)  # seleção por proposta: {chave:{ligado,versao,texto_customizado}}
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    grupos = relationship("PropGrupo", backref="proposta", cascade="all, delete-orphan", order_by="PropGrupo.ordem")


class PropGrupo(Base):
    __tablename__ = "prop_grupos"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    proposta_id = Column(UUID(as_uuid=True), ForeignKey("prop_propostas.id", ondelete="CASCADE"), nullable=False)
    categoria = Column(String(40))
    moeda = Column(String(8), default="BRL")
    descritivo_unidade = Column(String(200))
    periodo_locacao_meses = Column(Integer)  # nulo se venda
    ordem = Column(Integer, default=0)
    itens = relationship("PropItem", backref="grupo", cascade="all, delete-orphan", order_by="PropItem.ordem")
    perdas = relationship("PropPerda", backref="grupo", cascade="all, delete-orphan")


class PropItem(Base):
    __tablename__ = "prop_itens"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    grupo_id = Column(UUID(as_uuid=True), ForeignKey("prop_grupos.id", ondelete="CASCADE"), nullable=False)
    produto_id = Column(UUID(as_uuid=True), ForeignKey("prop_produtos.id"))
    codigo_produto = Column(String(80))
    info_adicional = Column(Text)
    quantidade = Column(Float, default=0)
    valor_unitario = Column(Float, default=0)
    margem_percentual = Column(Float, default=0)
    ordem = Column(Integer, default=0)


class PropPerda(Base):
    """Tabela de Perda ou Extravio (só locação)."""
    __tablename__ = "prop_perda_extravio"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    grupo_id = Column(UUID(as_uuid=True), ForeignKey("prop_grupos.id", ondelete="CASCADE"), nullable=False)
    descricao_item = Column(String(200))
    valor_reposicao = Column(Float, default=0)
