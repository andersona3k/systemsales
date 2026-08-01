import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Integer, Float, Boolean, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from ..database import Base


class PropConfig(Base):
    """Configuração do módulo Comercial (grupos de produto, colunas extras, etc.)."""
    __tablename__ = "prop_config"
    chave = Column(String(60), primary_key=True)
    valor = Column(JSONB)


class PropTemplate(Base):
    """Modelo/template de proposta. 'config' guarda os booleanos (toggles de bloco) e descritivos por modelo."""
    __tablename__ = "prop_templates"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tipo = Column(String(20), nullable=False)  # venda | locacao
    nome = Column(String(200), nullable=False)          # nome interno
    nome_exibicao = Column(String(200))                 # nome que aparece na proposta
    versao = Column(Integer, default=1)
    ativo = Column(Boolean, default=True, server_default=text("true"))
    config = Column(JSONB, default=dict)  # {blocos:{chave:{ligado,descritivo}}, grupos_categorias:[...]}
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class PropProduto(Base):
    """Catálogo de produtos do módulo Comercial. Campos fixos: Código, Descrição, NCM, Grupo (+ colunas extras)."""
    __tablename__ = "prop_produtos"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    codigo = Column(String(80))
    descricao = Column(String(300))
    ncm = Column(String(20))
    grupo = Column(String(80))
    campos_extras = Column(JSONB, default=dict)  # colunas adicionais configuráveis
    ativo = Column(Boolean, default=True, server_default=text("true"))
    criado_em = Column(DateTime, default=datetime.utcnow)


class PropContentBlock(Base):
    """Estrutura dos blocos de cláusula (definida em Configurações). conteudo_padrao = descritivo padrão."""
    __tablename__ = "prop_content_blocks"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chave = Column(String(60), nullable=False)
    titulo = Column(String(200))
    aplica_se_a = Column(String(20), default="ambos")  # venda | locacao | ambos
    conteudo_padrao = Column(JSONB, default=dict)
    padrao = Column(Boolean, default=False, server_default=text("false"))     # entra por padrão
    sugerido = Column(Boolean, default=False, server_default=text("false"))   # sugerido (opcional)
    versao = Column(Integer, default=1)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class PropProposta(Base):
    __tablename__ = "prop_propostas"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tipo = Column(String(20), nullable=False)  # venda | locacao
    status = Column(String(20), default="rascunho", server_default=text("'rascunho'"))
    template_id = Column(UUID(as_uuid=True), ForeignKey("prop_templates.id"))
    empresa_id = Column(UUID(as_uuid=True), ForeignKey("prosp_empresas.id"))  # cliente (Prospecção) — migra p/ card do Funil depois
    pessoa_id = Column(UUID(as_uuid=True), ForeignKey("prosp_pessoas.id"))    # contato (Prospecção)
    card_id = Column(UUID(as_uuid=True), ForeignKey("prosp_cards.id"))        # vínculo com card do Funil (a usar na sequência)
    data = Column(String(10))
    validade_dias = Column(Integer)
    texto_comercial = Column(JSONB, default=dict)
    moeda_padrao = Column(String(8), default="BRL")
    blocos = Column(JSONB, default=dict)
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
    periodo_locacao_meses = Column(Integer)
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


class Funil(Base):
    __tablename__ = "com_funis"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nome = Column(String(200), nullable=False)
    etapas = Column(JSONB, default=list)
    ativo = Column(Boolean, default=True, server_default=text("true"))
    ordem = Column(Integer, default=0)
    criado_em = Column(DateTime, default=datetime.utcnow)


class Oportunidade(Base):
    __tablename__ = "com_oportunidades"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    funil_id = Column(UUID(as_uuid=True), ForeignKey("com_funis.id", ondelete="CASCADE"), nullable=False)
    etapa = Column(String(120))
    titulo = Column(String(200))
    empresa_id = Column(UUID(as_uuid=True), ForeignKey("prosp_empresas.id"))
    pessoa_id = Column(UUID(as_uuid=True), ForeignKey("prosp_pessoas.id"))
    vendedor = Column(String(120))
    marcadores = Column(JSONB, default=list)
    origem = Column(String(80))
    tipo = Column(String(40))
    sinaleiro = Column(String(10), default="red", server_default=text("'red'"))
    ordem = Column(Integer, default=0)
    arquivado = Column(Boolean, default=False, server_default=text("false"))
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
