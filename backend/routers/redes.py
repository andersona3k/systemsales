from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.rede_social import RedeSocial
from ..schemas.rede_social import RedeIn, RedeUpdate, RedeOut
from ..services.auth_service import get_current_user

router = APIRouter(prefix="/api/redes", tags=["Redes Sociais"])


@router.get("", response_model=List[RedeOut])
def listar(todas: bool = False, db: Session = Depends(get_db), _=Depends(get_current_user)):
    q = db.query(RedeSocial)
    if not todas:
        q = q.filter(RedeSocial.ativo == True)
    return q.order_by(RedeSocial.ordem, RedeSocial.criado_em).all()


@router.post("", response_model=RedeOut, status_code=201)
def criar(dados: RedeIn, db: Session = Depends(get_db), _=Depends(get_current_user)):
    r = RedeSocial(**dados.model_dump()); db.add(r); db.commit(); db.refresh(r)
    return r


@router.patch("/{rid}", response_model=RedeOut)
def atualizar(rid: UUID, dados: RedeUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    r = db.query(RedeSocial).filter(RedeSocial.id == rid).first()
    if not r:
        raise HTTPException(status_code=404, detail="Rede não encontrada")
    for k, v in dados.model_dump(exclude_unset=True).items():
        setattr(r, k, v)
    db.commit(); db.refresh(r)
    return r


@router.delete("/{rid}", status_code=204)
def deletar(rid: UUID, db: Session = Depends(get_db), _=Depends(get_current_user)):
    r = db.query(RedeSocial).filter(RedeSocial.id == rid).first()
    if not r:
        raise HTTPException(status_code=404, detail="Rede não encontrada")
    r.ativo = False; db.commit()
