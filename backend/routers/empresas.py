from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from uuid import UUID
from ..database import get_db
from ..models.empresa import Empresa
from ..schemas.empresa import EmpresaCreate, EmpresaUpdate, EmpresaOut
from ..services.auth_service import get_current_user
from ..services.validacao_service import validar_cnpj

router = APIRouter(prefix="/api/empresas", tags=["Empresas"])


@router.get("", response_model=dict)
def listar_empresas(
    q: str | None = None,
    situacao: str | None = None,
    segmento: str | None = None,
    status: str | None = None,
    responsavel: str | None = None,
    cidade: str | None = None,
    categoria_id: UUID | None = None,
    pagina: int = Query(1, ge=1),
    por_pagina: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    query = db.query(Empresa)
    if q:
        query = query.filter(or_(
            func.lower(Empresa.nome).contains(func.lower(q)),
            func.lower(Empresa.razao_social).contains(func.lower(q)),
            func.lower(Empresa.cnpj).contains(func.lower(q)),
        ))
    if situacao:
        query = query.filter(Empresa.situacao == situacao)
    if segmento:
        query = query.filter(Empresa.segmento == segmento)
    if status:
        query = query.filter(Empresa.status == status)
    if responsavel:
        query = query.filter(func.lower(Empresa.responsavel).contains(func.lower(responsavel)))
    if cidade:
        query = query.filter(func.lower(Empresa.cidade).contains(func.lower(cidade)))
    if categoria_id:
        query = query.filter(Empresa.categoria_id == categoria_id)

    total = query.count()
    empresas = query.order_by(Empresa.nome).offset((pagina - 1) * por_pagina).limit(por_pagina).all()
    itens = []
    for e in empresas:
        itens.append({
            "id": str(e.id), "nome": e.nome, "razao_social": e.razao_social, "cnpj": e.cnpj,
            "status": e.status, "situacao": e.situacao, "responsavel": e.responsavel,
            "data_ultimo_contato": e.data_ultimo_contato, "segmento": e.segmento, "cidade": e.cidade,
            "num_contatos": len(e.contatos),
            "categoria_id": str(e.categoria_id) if e.categoria_id else None,
            "criado_em": e.criado_em.isoformat(),
        })
    return {"total": total, "pagina": pagina, "por_pagina": por_pagina, "itens": itens}


@router.post("", response_model=EmpresaOut, status_code=201)
def criar_empresa(dados: EmpresaCreate, db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    if dados.cnpj and not validar_cnpj(dados.cnpj):
        raise HTTPException(status_code=422, detail="CNPJ inválido")
    empresa = Empresa(**dados.model_dump())
    db.add(empresa); db.commit(); db.refresh(empresa)
    return empresa


@router.get("/{empresa_id}", response_model=EmpresaOut)
def obter_empresa(empresa_id: UUID, db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    return empresa


@router.put("/{empresa_id}", response_model=EmpresaOut)
def atualizar_empresa(empresa_id: UUID, dados: EmpresaUpdate, db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    if dados.cnpj and not validar_cnpj(dados.cnpj):
        raise HTTPException(status_code=422, detail="CNPJ inválido")
    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(empresa, campo, valor)
    db.commit(); db.refresh(empresa)
    return empresa


@router.patch("/{empresa_id}/inline", response_model=EmpresaOut)
def editar_inline_empresa(empresa_id: UUID, dados: dict = Body(...), db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    permitidos = {"situacao", "segmento", "status", "responsavel", "cidade", "data_ultimo_contato", "razao_social"}
    for k, v in dados.items():
        if k in permitidos:
            setattr(empresa, k, v)
    db.commit(); db.refresh(empresa)
    return empresa


@router.delete("/{empresa_id}", status_code=204)
def deletar_empresa(empresa_id: UUID, db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    db.delete(empresa); db.commit()
