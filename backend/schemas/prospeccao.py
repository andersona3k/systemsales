from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime


class ProspPessoaIn(BaseModel):
    nome: str
    linkedin_status: str | None = None  # '1' | 'nao_contato'
    linkedin_url: str | None = None
    telefone: str | None = None
    email: str | None = None
    setor: str | None = None
    cargo: str | None = None


class ProspPessoaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    empresa_id: UUID
    nome: str
    linkedin_status: str | None = None
    linkedin_url: str | None = None
    telefone: str | None = None
    email: str | None = None
    setor: str | None = None
    cargo: str | None = None
    empresa_nome: str | None = None


class ProspEmpresaIn(BaseModel):
    nome: str
    cnpj: str | None = None
    segmento: str | None = None
    estado: str | None = None
    cidade: str | None = None
    website: str | None = None
    instagram: str | None = None
    linkedin_url: str | None = None
    origem: str | None = None
    status: str | None = None


class ProspEmpresaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    nome: str
    cnpj: str | None = None
    segmento: str | None = None
    estado: str | None = None
    cidade: str | None = None
    website: str | None = None
    instagram: str | None = None
    linkedin_url: str | None = None
    origem: str | None = None
    status: str | None = None
    criado_em: datetime
    total_pessoas: int = 0
    tem_lista: bool = False
    pessoas: list[ProspPessoaOut] = []


class ProspListaIn(BaseModel):
    nome: str
    tipo: str | None = None  # mapeamento | social | direto | reativacao
    linha_atuacao: str | None = None
    filtros_json: dict = {}
    empresa_ids: list[UUID] = []


class ProspListaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    nome: str
    tipo: str | None = None
    linha_atuacao: str | None = None
    filtros_json: dict = {}
    checklist_modo: str = "nenhum"
    checklist_template_id: UUID | None = None
    checklist_por_etapa: dict = {}
    criado_em: datetime
    total_empresas: int = 0
    empresas: list[ProspEmpresaOut] = []


class ProspListaAddEmpresasIn(BaseModel):
    empresa_ids: list[UUID] = []


class ProspAtividadeIn(BaseModel):
    tipo: str | None = None
    texto: str


class ProspAtividadeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    tipo: str | None = None
    texto: str
    data_hora: datetime


class ProspCardOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    empresa_id: UUID
    lista_id: UUID
    board: str
    etapa: str
    sinaleiro: str
    checklist_state: dict = {}
    data_entrada_etapa: datetime
    arquivado: bool = False
    criado_em: datetime
    dias_na_etapa: int = 0
    empresa: ProspEmpresaOut | None = None
    lista_nome: str | None = None
    lista_tipo: str | None = None
    lista_linha_atuacao: str | None = None
    atividades: list[ProspAtividadeOut] = []


class ChecklistTemplateIn(BaseModel):
    nome: str
    itens: list[str] = []


class ChecklistTemplateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    nome: str
    itens: list[str] = []
