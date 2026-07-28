from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from ..database import get_db
from ..models.perfil_exportacao import PerfilExportacao
from ..schemas.perfil_exportacao import PerfilExportacaoCreate, PerfilExportacaoUpdate, PerfilExportacaoOut
from ..services.auth_service import get_current_user

router = APIRouter(prefix="/api/perfis-exportacao", tags=["Perfis de Exportação"])


@router.get("", response_model=list[PerfilExportacaoOut])
def listar_perfis(db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    return db.query(PerfilExportacao).order_by(PerfilExportacao.nome).all()


@router.post("", response_model=PerfilExportacaoOut, status_code=201)
def criar_perfil(dados: PerfilExportacaoCreate, db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    perfil = PerfilExportacao(**dados.model_dump())
    db.add(perfil)
    db.commit()
    db.refresh(perfil)
    return perfil


@router.put("/{perfil_id}", response_model=PerfilExportacaoOut)
def atualizar_perfil(
    perfil_id: UUID,
    dados: PerfilExportacaoUpdate,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    perfil = db.query(PerfilExportacao).filter(PerfilExportacao.id == perfil_id).first()
    if not perfil:
        raise HTTPException(status_code=404, detail="Perfil não encontrado")
    for k, v in dados.model_dump(exclude_unset=True).items():
        setattr(perfil, k, v)
    db.commit()
    db.refresh(perfil)
    return perfil


@router.delete("/{perfil_id}", status_code=204)
def deletar_perfil(perfil_id: UUID, db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    perfil = db.query(PerfilExportacao).filter(PerfilExportacao.id == perfil_id).first()
    if not perfil:
        raise HTTPException(status_code=404, detail="Perfil não encontrado")
    db.delete(perfil)
    db.commit()
