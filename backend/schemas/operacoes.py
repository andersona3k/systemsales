from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime, date


class PrecificacaoProdutoIn(BaseModel):
    id: UUID | None = None
    pn: str | None = None
    descricao: str | None = None
    custo: float = 0
    margem_pct: float | None = None  # None = herda margem_padrao do evento


class PrecificacaoProdutoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    pn: str | None = None
    descricao: str | None = None
    custo: float
    margem_pct: float | None = None
    margem_efetiva: float = 20
    foto_url: str | None = None
    venda: float = 0
    custo_brl: float | None = None
    venda_brl: float | None = None


class PrecificacaoEventoIn(BaseModel):
    data: date | None = None
    cliente: str | None = None
    oportunidade: str | None = None
    dr: str | None = None
    pc: str | None = None
    goevo: str | None = None
    descricao: str | None = None
    ptax_valor: float | None = None
    ptax_data: date | None = None
    transformar_reais: bool = False
    margem_padrao: float = 20
    moeda: str = "usd"
    produtos: list[PrecificacaoProdutoIn] = []


class PrecificacaoEventoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    data: date | None = None
    cliente: str | None = None
    oportunidade: str | None = None
    dr: str | None = None
    pc: str | None = None
    goevo: str | None = None
    descricao: str | None = None
    ptax_valor: float | None = None
    ptax_data: date | None = None
    transformar_reais: bool = False
    margem_padrao: float = 20
    moeda: str = "usd"
    criado_em: datetime
    total_produtos: int = 0
    produtos: list[PrecificacaoProdutoOut] = []
