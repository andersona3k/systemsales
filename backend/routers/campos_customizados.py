from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from ..database import get_db
from ..models.campo_customizado import CampoCustomizado
from ..schemas.campo_customizado import CampoCustomizadoCreate, CampoCustomizadoUpdate, CampoCustomizadoOut
from ..services.auth_service import get_current_user
from slugify import slugify

router = APIRouter(prefix="/api/campos-customizados", tags=["Campos Customizados"])


@router.get("", response_model=list[CampoCustomizadoOut])
def listar_campos(
    entidade: str | None = None,
    apenas_ativos: bool = True,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    query = db.query(CampoCustomizado)
    if entidade:
        query = query.filter(
            (CampoCustomizado.entidade == entidade) | (CampoCustomizado.entidade == "ambos")
        )
    if apenas_ativos:
        query = query.filter(CampoCustomizado.ativo == True)
    return query.order_by(CampoCustomizado.ordem).all()


@router.post("", response_model=CampoCustomizadoOut, status_code=201)
def criar_campo(
    dados: CampoCustomizadoCreate,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    chave = slugify(dados.chave or dados.nome, separator="_")
    existente = db.query(CampoCustomizado).filter(CampoCustomizado.chave == chave).first()
    if existente:
        raise HTTPException(status_code=409, detail=f"Campo com chave '{chave}' já existe")
    campo = CampoCustomizado(**dados.model_dump())
    campo.chave = chave
    db.add(campo)
    db.commit()
    db.refresh(campo)
    return campo


@router.put("/{campo_id}", response_model=CampoCustomizadoOut)
def atualizar_campo(
    campo_id: UUID,
    dados: CampoCustomizadoUpdate,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    campo = db.query(CampoCustomizado).filter(CampoCustomizado.id == campo_id).first()
    if not campo:
        raise HTTPException(status_code=404, detail="Campo não encontrado")
    for k, v in dados.model_dump(exclude_unset=True).items():
        setattr(campo, k, v)
    db.commit()
    db.refresh(campo)
    return campo


@router.delete("/{campo_id}", status_code=204)
def deletar_campo(
    campo_id: UUID,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    campo = db.query(CampoCustomizado).filter(CampoCustomizado.id == campo_id).first()
    if not campo:
        raise HTTPException(status_code=404, detail="Campo não encontrado")
    campo.ativo = False
    db.commit()
