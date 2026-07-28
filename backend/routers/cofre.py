from typing import List
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.cofre import CofreMeta, Acesso
from ..schemas.cofre import CofreMetaIn, CofreMetaOut, AcessoIn, AcessoUpdate, AcessoOut
from ..services.auth_service import get_current_user

router = APIRouter(prefix="/api/cofre", tags=["Cofre"])


def _username(u):
    if isinstance(u, dict):
        return u.get("username") or u.get("sub") or u.get("uid")
    return u


# ---------- meta (destravar/setup) ----------
@router.get("/meta", response_model=CofreMetaOut)
def obter_meta(db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    meta = db.query(CofreMeta).filter(CofreMeta.username == _username(usuario)).first()
    if not meta:
        raise HTTPException(status_code=404, detail="Cofre ainda não configurado")
    return meta


@router.post("/meta", response_model=CofreMetaOut, status_code=201)
def criar_meta(dados: CofreMetaIn, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    user = _username(usuario)
    if db.query(CofreMeta).filter(CofreMeta.username == user).first():
        raise HTTPException(status_code=409, detail="Cofre já configurado")
    meta = CofreMeta(username=user, salt=dados.salt, verifier_iv=dados.verifier_iv,
                     verifier=dados.verifier, kdf_iters=dados.kdf_iters)
    db.add(meta); db.commit(); db.refresh(meta)
    return meta


# ---------- acessos (CRUD) ----------
@router.get("/acessos", response_model=List[AcessoOut])
def listar_acessos(db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    return db.query(Acesso).filter(Acesso.username == _username(usuario)).order_by(Acesso.sistema).all()


@router.post("/acessos", response_model=AcessoOut, status_code=201)
def criar_acesso(dados: AcessoIn, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    ac = Acesso(username=_username(usuario), **dados.model_dump())
    db.add(ac); db.commit(); db.refresh(ac)
    return ac


@router.patch("/acessos/{acesso_id}", response_model=AcessoOut)
def atualizar_acesso(acesso_id: UUID, dados: AcessoUpdate, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    ac = db.query(Acesso).filter(Acesso.id == acesso_id, Acesso.username == _username(usuario)).first()
    if not ac:
        raise HTTPException(status_code=404, detail="Acesso não encontrado")
    payload = dados.model_dump(exclude_unset=True)
    bump = ("segredo" in payload) and (payload.get("segredo") != ac.segredo)
    for k, v in payload.items():
        setattr(ac, k, v)
    if bump:
        ac.atualizado_em = datetime.utcnow()
    db.commit(); db.refresh(ac)
    return ac


@router.delete("/acessos/{acesso_id}", status_code=204)
def deletar_acesso(acesso_id: UUID, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    ac = db.query(Acesso).filter(Acesso.id == acesso_id, Acesso.username == _username(usuario)).first()
    if not ac:
        raise HTTPException(status_code=404, detail="Acesso não encontrado")
    db.delete(ac); db.commit()
