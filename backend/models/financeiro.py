import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, Text, DateTime, Date, Integer, Boolean, Float, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from ..database import Base


class Venda(Base):
    __tablename__ = "vendas"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_lead = Column(String(40))
    numero_venda = Column(String(60))
    estagio = Column(String(40))
    data_venda = Column(String(10))
    vendedor = Column(String(120))
    cliente = Column(String(200))
    quem_fatura = Column(String(120))
    mensal = Column(Boolean, default=False, server_default=text("false"))
    informacoes_complementares = Column(Text)
    anexos = Column(JSONB, default=list)
    comissao_pago_em = Column(String(10))
    comissao_status = Column(String(20))
    comissao_meses = Column(JSONB, default=dict)
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    itens = relationship("VendaItem", backref="venda", cascade="all, delete-orphan", order_by="VendaItem.criado_em")


class VendaItem(Base):
    __tablename__ = "venda_itens"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    venda_id = Column(UUID(as_uuid=True), ForeignKey("vendas.id", ondelete="CASCADE"), nullable=False)
    grupo = Column(String(80))
    produto = Column(String(200))
    detalhes = Column(Text)
    quem_fatura = Column(String(120))
    moeda = Column(String(8), default='BRL')
    custo = Column(Float, default=0)
    valor = Column(Float, default=0)
    parcelas = Column(Integer, default=1)
    contrato = Column(Integer)
    dias_pagamento = Column(Integer, default=0)
    nf_numero = Column(String(60))
    nf_data = Column(String(10))
    nf_valor = Column(Float)
    campos_extras = Column(JSONB, default=dict)
    criado_em = Column(DateTime, default=datetime.utcnow)


class Produto(Base):
    __tablename__ = "fin_produtos"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nome = Column(String(200), nullable=False)
    grupo = Column(String(80))
    mensal = Column(Boolean, default=False, server_default=text("false"))
    ativo = Column(Boolean, default=True, server_default=text("true"))
    criado_em = Column(DateTime, default=datetime.utcnow)


class FinConfig(Base):
    __tablename__ = "fin_config"
    chave = Column(String(60), primary_key=True)
    valor = Column(JSONB)


class FinLancamento(Base):
    __tablename__ = "fin_lancamentos"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    grupo = Column(String(20))  # pessoal | empresa
    categoria = Column(String(20), nullable=False)  # despesa | divida | receita | investimento
    metodo = Column(String(20), nullable=False)  # mensal | financiamento | pontual
    conta = Column(String(200))
    responsavel = Column(String(30))
    descricao = Column(Text)
    credor_pagador = Column(String(200))
    valor = Column(Float, default=0)
    data_inicio = Column(Date, nullable=False)
    numero_parcelas = Column(Integer)
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    parcelas = relationship("FinParcela", backref="lancamento", cascade="all, delete-orphan", order_by="FinParcela.numero")


class FinParcela(Base):
    __tablename__ = "fin_parcelas"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lancamento_id = Column(UUID(as_uuid=True), ForeignKey("fin_lancamentos.id", ondelete="CASCADE"), nullable=False)
    numero = Column(Integer)
    vencimento = Column(Date, nullable=False)
    valor = Column(Float, default=0)
    juros = Column(Float, default=0, server_default=text("0"))
    desconto = Column(Float, default=0, server_default=text("0"))
    modo_pagamento = Column(String(30))
    observacao = Column(Text)
    anexos = Column(JSONB, default=list)
    pago_em = Column(Date)
    criado_em = Column(DateTime, default=datetime.utcnow)


class FinCcLancamento(Base):
    __tablename__ = "fin_cc_lancamentos"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    grupo = Column(String(20))  # pessoal | empresa
    categoria = Column(String(20), nullable=False)  # despesa | divida | receita | investimento
    cartao = Column(String(30), nullable=False)
    conta = Column(String(200))
    sub_conta = Column(String(200))
    responsavel = Column(String(30))
    descricao = Column(Text)
    credor_pagador = Column(String(200))
    metodo = Column(String(20), nullable=False)  # avista | parcelado | recorrente
    metodo_pg = Column(String(20), default="cartao", server_default=text("'cartao'"))  # cartao | dinheiro | pix | debito
    valor = Column(Float, default=0)
    data_compra = Column(Date, nullable=False)
    numero_parcelas = Column(Integer)
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    parcelas = relationship("FinCcParcela", backref="lancamento", cascade="all, delete-orphan", order_by="FinCcParcela.numero")


class FinCcParcela(Base):
    __tablename__ = "fin_cc_parcelas"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lancamento_id = Column(UUID(as_uuid=True), ForeignKey("fin_cc_lancamentos.id", ondelete="CASCADE"), nullable=False)
    numero = Column(Integer)
    valor = Column(Float, default=0)
    observacao = Column(Text)
    anexos = Column(JSONB, default=list)
    criado_em = Column(DateTime, default=datetime.utcnow)


class FinCcAjuste(Base):
    __tablename__ = "fin_cc_ajustes"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cartao = Column(String(30), nullable=False)
    vencimento_fatura = Column(Date, nullable=False)
    valor_ajuste = Column(Float, default=0, server_default=text("0"))
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Forecast(Base):
    __tablename__ = "fin_forecast"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_lead = Column(String(40))
    cliente = Column(String(200))
    status = Column(String(20), default="Forcast", server_default=text("'Forcast'"))
    previsao_fechamento = Column(String(10))
    pct_fechamento = Column(Integer, default=0)
    tipo = Column(String(20))
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    itens = relationship("ForecastItem", backref="forecast", cascade="all, delete-orphan", order_by="ForecastItem.ordem")


class ForecastItem(Base):
    __tablename__ = "fin_forecast_itens"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    forecast_id = Column(UUID(as_uuid=True), ForeignKey("fin_forecast.id", ondelete="CASCADE"), nullable=False)
    produto = Column(String(80))
    classe = Column(String(120))
    tipo_linha = Column(String(20), default="Projeto")
    quantidade = Column(Float, default=1)
    valor_custo = Column(Float, default=0)
    valor_venda = Column(Float, default=0)
    meses = Column(Integer, default=1)
    ordem = Column(Integer, default=0)
    criado_em = Column(DateTime, default=datetime.utcnow)
