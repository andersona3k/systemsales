from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime, date


class VendaItemIn(BaseModel):
    grupo: str | None = None
    produto: str | None = None
    detalhes: str | None = None
    quem_fatura: str | None = None
    moeda: str | None = 'BRL'
    valor: float | None = 0
    parcelas: int = 1
    contrato: int | None = None
    dias_pagamento: int = 0
    nf_numero: str | None = None
    nf_data: str | None = None
    nf_valor: float | None = None
    campos_extras: dict = {}


class VendaItemOut(VendaItemIn):
    model_config = ConfigDict(from_attributes=True)
    id: UUID


class VendaIn(BaseModel):
    id_lead: str | None = None
    estagio: str | None = None
    data_venda: str | None = None
    vendedor: str | None = None
    cliente: str | None = None
    quem_fatura: str | None = None
    mensal: bool = False
    anexos: list[str] = []
    comissao_pago_em: str | None = None
    comissao_status: str | None = None
    comissao_meses: dict = {}
    itens: list[VendaItemIn] = []


class VendaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    id_lead: str | None = None
    estagio: str | None = None
    data_venda: str | None = None
    vendedor: str | None = None
    cliente: str | None = None
    quem_fatura: str | None = None
    mensal: bool = False
    anexos: list[str] = []
    comissao_pago_em: str | None = None
    comissao_status: str | None = None
    comissao_meses: dict = {}
    criado_em: datetime
    itens: list[VendaItemOut] = []


class ProdutoIn(BaseModel):
    nome: str
    grupo: str | None = None
    mensal: bool = False
    ativo: bool = True


class ProdutoOut(ProdutoIn):
    model_config = ConfigDict(from_attributes=True)
    id: UUID


class FinLancamentoIn(BaseModel):
    grupo: str  # pessoal | empresa
    categoria: str  # despesa | divida | receita | investimento
    metodo: str  # mensal | financiamento | pontual
    conta: str | None = None
    descricao: str | None = None
    credor_pagador: str | None = None
    valor: float = 0
    data_inicio: date
    numero_parcelas: int | None = None
    modo_pagamento: str | None = None


class FinLancamentoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    grupo: str | None = None
    categoria: str
    metodo: str
    conta: str | None = None
    descricao: str | None = None
    credor_pagador: str | None = None
    valor: float
    data_inicio: date
    numero_parcelas: int | None = None
    criado_em: datetime


class FinParcelaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    lancamento_id: UUID
    numero: int | None = None
    vencimento: date
    valor: float
    juros: float = 0
    desconto: float = 0
    valor_final: float = 0
    modo_pagamento: str | None = None
    observacao: str | None = None
    anexos: list[str] = []
    pago_em: date | None = None
    status: str = "planejado"
    grupo: str | None = None
    categoria: str | None = None
    metodo: str | None = None
    conta: str | None = None
    descricao: str | None = None
    credor_pagador: str | None = None
    total_parcelas: int | None = None


class FinCcLancamentoIn(BaseModel):
    grupo: str  # pessoal | empresa
    categoria: str  # despesa | divida | receita | investimento
    cartao: str
    metodo: str  # avista | parcelado | recorrente
    metodo_pg: str = "cartao"  # cartao | dinheiro | pix | debito
    conta: str | None = None
    sub_conta: str | None = None
    descricao: str | None = None
    credor_pagador: str | None = None
    valor: float = 0  # valor total da compra
    data_compra: date
    numero_parcelas: int | None = None
    valores_parcelas: list[float] | None = None  # opcional: valor individual de cada parcela


class FinCcLancamentoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    grupo: str | None = None
    categoria: str
    cartao: str
    metodo: str
    metodo_pg: str | None = None
    conta: str | None = None
    sub_conta: str | None = None
    descricao: str | None = None
    credor_pagador: str | None = None
    valor: float
    data_compra: date
    numero_parcelas: int | None = None
    criado_em: datetime


class FinCcParcelaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    lancamento_id: UUID
    numero: int | None = None
    valor: float
    observacao: str | None = None
    anexos: list[str] = []
    vencimento_fatura: date
    grupo: str | None = None
    categoria: str | None = None
    cartao: str | None = None
    metodo: str | None = None
    metodo_pg: str | None = None
    conta: str | None = None
    sub_conta: str | None = None
    descricao: str | None = None
    credor_pagador: str | None = None
    data_compra: date | None = None
    total_parcelas: int | None = None


class FinCcResumoOut(BaseModel):
    cartao: str
    nome: str
    vencimento_fatura: date
    total: float
