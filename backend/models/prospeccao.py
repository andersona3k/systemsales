import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, Text, DateTime, Boolean, ForeignKey, Table, text, Date, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from ..database import Base

prosp_empresa_lista = Table(
    "prosp_empresa_lista", Base.metadata,
    Column("empresa_id", UUID(as_uuid=True), ForeignKey("prosp_empresas.id", ondelete="CASCADE"), primary_key=True),
    Column("lista_id", UUID(as_uuid=True), ForeignKey("prosp_listas.id", ondelete="CASCADE"), primary_key=True),
)


class ProspEmpresa(Base):
    __tablename__ = "prosp_empresas"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nome = Column(String(200), nullable=False)
    cnpj = Column(String(30))
    segmento = Column(String(120))
    estado = Column(String(2))
    cidade = Column(String(120))
    website = Column(String(300))
    instagram = Column(String(300))
    linkedin_url = Column(String(300))
    origem = Column(String(120))
    status = Column(String(30), default="novo", server_default=text("'novo'"))
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    pessoas = relationship("ProspPessoa", backref="empresa", cascade="all, delete-orphan", order_by="ProspPessoa.criado_em")
    listas = relationship("ProspLista", secondary=prosp_empresa_lista, back_populates="empresas")


class ProspPessoa(Base):
    __tablename__ = "prosp_pessoas"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id = Column(UUID(as_uuid=True), ForeignKey("prosp_empresas.id", ondelete="CASCADE"), nullable=False)
    nome = Column(String(200), nullable=False)
    linkedin_status = Column(String(20))  # '1' (1º grau) | 'nao_contato' | null
    linkedin_url = Column(String(300))
    telefone = Column(String(40))  # formatado: +55 (47) 99100 0202
    email = Column(String(200))
    setor = Column(String(120))
    cargo = Column(String(120))
    criado_em = Column(DateTime, default=datetime.utcnow)


class ProspLista(Base):
    __tablename__ = "prosp_listas"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nome = Column(String(200), nullable=False)
    tipo = Column(String(20))  # mapeamento | social | direto | reativacao
    linha_atuacao = Column(String(20))
    filtros_json = Column(JSONB, default=dict)
    checklist_modo = Column(String(20), default="nenhum", server_default=text("'nenhum'"))  # nenhum | global | por_etapa
    checklist_template_id = Column(UUID(as_uuid=True), ForeignKey("prosp_checklist_templates.id"))
    checklist_por_etapa = Column(JSONB, default=dict)
    criado_em = Column(DateTime, default=datetime.utcnow)
    empresas = relationship("ProspEmpresa", secondary=prosp_empresa_lista, back_populates="listas")


class ChecklistTemplate(Base):
    __tablename__ = "prosp_checklist_templates"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nome = Column(String(200), nullable=False)
    itens = Column(JSONB, default=list)
    criado_em = Column(DateTime, default=datetime.utcnow)


class ProspCard(Base):
    __tablename__ = "prosp_cards"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id = Column(UUID(as_uuid=True), ForeignKey("prosp_empresas.id", ondelete="CASCADE"), nullable=False)
    lista_id = Column(UUID(as_uuid=True), ForeignKey("prosp_listas.id", ondelete="CASCADE"), nullable=False)
    board = Column(String(20), nullable=False)  # mapeamento | social | direto | reativacao | lead
    etapa = Column(String(80), nullable=False)
    sinaleiro = Column(String(10), default="red", server_default=text("'red'"))  # red | yellow | green
    checklist_state = Column(JSONB, default=dict)
    data_entrada_etapa = Column(DateTime, default=datetime.utcnow)
    arquivado = Column(Boolean, default=False, server_default=text("false"))
    criado_em = Column(DateTime, default=datetime.utcnow)
    empresa = relationship("ProspEmpresa")
    lista = relationship("ProspLista")
    atividades = relationship("ProspAtividade", backref="card", cascade="all, delete-orphan", order_by="ProspAtividade.data_hora.desc()")


class ProspAtividade(Base):
    __tablename__ = "prosp_atividades"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    card_id = Column(UUID(as_uuid=True), ForeignKey("prosp_cards.id", ondelete="CASCADE"), nullable=False)
    tipo = Column(String(20))  # email | inmail | whatsapp | telefone | reuniao | linkedin | null (sistema)
    texto = Column(Text, nullable=False)
    data_hora = Column(DateTime, default=datetime.utcnow)


class CrmRegistro(Base):
    __tablename__ = "prosp_crm_registros"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    data = Column(Date, nullable=False, default=date.today)
    tipo = Column(String(40), nullable=False)
    quantidade = Column(Integer, default=1, server_default=text("1"))
    observacao = Column(Text)
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
